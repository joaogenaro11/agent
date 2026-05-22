import twilio, { type Twilio } from "twilio";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import type {
  NormalizedWhatsAppMessage,
  SendResult,
  WhatsAppProvider,
} from "./types";

const log = createLogger("whatsapp:twilio");

/** Garante o prefixo `whatsapp:` exigido pela API do Twilio. */
function asWhatsApp(number: string): string {
  const trimmed = number.trim();
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

/**
 * Provedor de WhatsApp via Twilio (Sandbox no MVP).
 * Migrar para o Twilio WhatsApp Business oficial não muda esta classe —
 * apenas exige um `TWILIO_WHATSAPP_FROM` aprovado e templates.
 */
export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name: string = "twilio";
  private client: Twilio | null = null;

  private getClient(): Twilio {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error(
        "Twilio não configurado: defina TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.",
      );
    }
    if (!this.client) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return this.client;
  }

  async sendMessage(to: string, message: string): Promise<SendResult> {
    const result = await this.getClient().messages.create({
      from: asWhatsApp(env.TWILIO_WHATSAPP_FROM),
      to: asWhatsApp(to),
      body: message,
    });
    log.info(`mensagem enviada (${result.sid}) para ${to}`);
    return { providerMessageId: result.sid };
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage {
    // Twilio envia o webhook como form-urlencoded: From, To, Body, MessageSid...
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      from: String(p.From ?? ""),
      to: String(p.To ?? ""),
      body: String(p.Body ?? ""),
      providerMessageId: p.MessageSid ? String(p.MessageSid) : null,
      timestamp: new Date(),
      raw: payload,
    };
  }

  async handleIncomingMessage(payload: unknown): Promise<NormalizedWhatsAppMessage> {
    return this.normalizeIncomingMessage(payload);
  }
}
