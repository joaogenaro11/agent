import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { getUserByPhone } from "@/lib/current-user";
import { getWhatsAppProvider } from "@/server/services/whatsapp";
import { sendDirectMessage } from "@/server/services/messaging/delivery";
import { processIncomingMessage } from "@/server/command-router";

const log = createLogger("webhook:whatsapp");

/**
 * Verificação do webhook (usada pela Meta Cloud API no futuro).
 * Twilio não usa GET; manter aqui não causa efeito colateral.
 */
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === env.META_WHATSAPP_VERIFY_TOKEN &&
    env.META_WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("ok", { status: 200 });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`webhook:${ip}`, 30, 60_000).allowed) {
    log.warn(`rate limit excedido para ${ip}`);
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let payload: Record<string, unknown>;

    if (contentType.includes("application/json")) {
      payload = (await req.json()) as Record<string, unknown>;
    } else {
      const form = await req.formData();
      payload = Object.fromEntries(form.entries());
    }

    // Validação de assinatura do Twilio (opcional, recomendada em produção).
    if (env.TWILIO_VALIDATE_SIGNATURE && env.TWILIO_AUTH_TOKEN) {
      const signature = req.headers.get("x-twilio-signature") ?? "";
      const url = `${env.APP_URL}/api/webhooks/whatsapp`;
      const valid = twilio.validateRequest(
        env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        payload as Record<string, string>,
      );
      if (!valid) {
        log.warn("assinatura do Twilio inválida");
        return new NextResponse("Invalid signature", { status: 403 });
      }
    }

    const provider = getWhatsAppProvider();
    const normalized = await provider.handleIncomingMessage(payload);

    if (!normalized.from || !normalized.body) {
      return new NextResponse("ignored", { status: 200 });
    }

    const user = await getUserByPhone(normalized.from);

    // Registra a mensagem recebida mesmo sem usuário associado.
    await prisma.whatsAppMessage.create({
      data: {
        userId: user?.id ?? null,
        direction: "INBOUND",
        from: normalized.from,
        to: normalized.to,
        body: normalized.body,
        providerMessageId: normalized.providerMessageId,
        rawPayload: payload as object,
      },
    });

    if (!user) {
      log.warn(`mensagem de número desconhecido: ${normalized.from}`);
      return new NextResponse("ok", { status: 200 });
    }

    const response = await processIncomingMessage(user, normalized.body);
    await sendDirectMessage(user.id, normalized.from, response);

    return new NextResponse("ok", { status: 200 });
  } catch (err) {
    log.error("falha ao processar webhook", err);
    // 200 evita reentregas em loop pelo provedor; o erro fica nos logs.
    return new NextResponse("error", { status: 200 });
  }
}
