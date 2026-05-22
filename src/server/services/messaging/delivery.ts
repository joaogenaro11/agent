import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { getWhatsAppProvider } from "@/server/services/whatsapp";

const log = createLogger("messaging:delivery");

export interface DeliveryRequest {
  userId: string;
  to: string;
  body: string;
  type: string;
  relatedEntityType: string;
  relatedEntityId: string;
  /** Ocorrência agendada — chave de deduplicação junto com a entidade. */
  scheduledFor: Date;
}

export type DeliveryResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Envia uma mensagem agendada garantindo entrega única.
 *
 * A deduplicação usa o índice único de MessageDeliveryLog
 * (relatedEntityType, relatedEntityId, scheduledFor): a linha é criada ANTES
 * do envio; se já existir, o disparo é ignorado. Isso evita mensagens
 * duplicadas mesmo que o scheduler rode mais de uma vez.
 */
export async function deliverScheduledMessage(
  req: DeliveryRequest,
): Promise<DeliveryResult> {
  // Normaliza para o minuto — duas execuções no mesmo minuto colidem na chave.
  const slot = new Date(req.scheduledFor);
  slot.setSeconds(0, 0);

  let logId: string;
  try {
    const row = await prisma.messageDeliveryLog.create({
      data: {
        userId: req.userId,
        type: req.type,
        relatedEntityType: req.relatedEntityType,
        relatedEntityId: req.relatedEntityId,
        scheduledFor: slot,
        status: "PENDING",
        messageBody: req.body,
      },
    });
    logId = row.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      log.debug(`disparo já registrado para ${req.relatedEntityType}:${req.relatedEntityId}`);
      return { status: "skipped", reason: "already-delivered" };
    }
    throw err;
  }

  try {
    const provider = getWhatsAppProvider();
    const result = await provider.sendMessage(req.to, req.body);
    await prisma.$transaction([
      prisma.messageDeliveryLog.update({
        where: { id: logId },
        data: { status: "SENT", sentAt: new Date() },
      }),
      prisma.whatsAppMessage.create({
        data: {
          userId: req.userId,
          direction: "OUTBOUND",
          from: "system",
          to: req.to,
          body: req.body,
          providerMessageId: result.providerMessageId,
        },
      }),
    ]);
    return { status: "sent", messageId: logId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.messageDeliveryLog.update({
      where: { id: logId },
      data: { status: "FAILED", errorMessage: message },
    });
    log.error(`falha ao enviar disparo ${logId}`, message);
    return { status: "failed", error: message };
  }
}

/**
 * Envia uma mensagem avulsa (resposta de conversa, teste do painel).
 * Não passa pela deduplicação de agendamento; apenas registra a mensagem.
 */
export async function sendDirectMessage(
  userId: string | null,
  to: string,
  body: string,
): Promise<{ ok: boolean; providerMessageId: string | null; error?: string }> {
  try {
    const provider = getWhatsAppProvider();
    const result = await provider.sendMessage(to, body);
    await prisma.whatsAppMessage.create({
      data: {
        userId,
        direction: "OUTBOUND",
        from: "system",
        to,
        body,
        providerMessageId: result.providerMessageId,
      },
    });
    return { ok: true, providerMessageId: result.providerMessageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`falha ao enviar mensagem direta para ${to}`, message);
    return { ok: false, providerMessageId: null, error: message };
  }
}
