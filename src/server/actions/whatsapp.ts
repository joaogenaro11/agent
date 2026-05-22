"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { sendDirectMessage } from "@/server/services/messaging/delivery";
import { processIncomingMessage } from "@/server/command-router";

const sendSchema = z.object({
  to: z.string().min(5, "Informe um número de destino"),
  message: z.string().min(1, "Escreva uma mensagem"),
});

export type WhatsAppActionState = {
  ok: boolean;
  message?: string;
  error?: string;
};

/** Envia uma mensagem de teste pelo provedor de WhatsApp ativo. */
export async function sendTestMessageAction(
  input: z.input<typeof sendSchema>,
): Promise<WhatsAppActionState> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const user = await getCurrentUser();
  const result = await sendDirectMessage(user.id, parsed.data.to, parsed.data.message);
  revalidatePath("/whatsapp-test");
  return result.ok
    ? { ok: true, message: "Mensagem enviada com sucesso." }
    : { ok: false, error: result.error ?? "Falha no envio" };
}

/**
 * Simula uma mensagem recebida do usuário, executando o pipeline completo
 * (interpretação por IA -> ação -> resposta). Útil para testar sem o Twilio.
 */
export async function simulateInboundAction(
  body: string,
): Promise<WhatsAppActionState> {
  if (!body.trim()) return { ok: false, error: "Escreva uma mensagem" };
  const user = await getCurrentUser();

  await prisma.whatsAppMessage.create({
    data: {
      userId: user.id,
      direction: "INBOUND",
      from: user.phone,
      to: "system",
      body,
    },
  });

  const response = await processIncomingMessage(user, body);

  await prisma.whatsAppMessage.create({
    data: {
      userId: user.id,
      direction: "OUTBOUND",
      from: "system",
      to: user.phone,
      body: response,
    },
  });

  revalidatePath("/whatsapp-test");
  return { ok: true, message: response };
}
