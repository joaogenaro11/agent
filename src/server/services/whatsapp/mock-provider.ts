import { createLogger } from "@/lib/logger";
import type {
  NormalizedWhatsAppMessage,
  SendResult,
  WhatsAppProvider,
} from "./types";

const log = createLogger("whatsapp:mock");

/** Mensagem registrada pelo provedor mock — útil em testes e demonstração. */
export interface MockSentMessage {
  to: string;
  body: string;
  sentAt: Date;
}

/**
 * Provedor de testes: não chama nenhuma API externa.
 * Guarda os envios em memória para inspeção.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";
  readonly sent: MockSentMessage[] = [];

  async sendMessage(to: string, message: string): Promise<SendResult> {
    const entry = { to, body: message, sentAt: new Date() };
    this.sent.push(entry);
    log.info(`(mock) mensagem para ${to}: ${message.slice(0, 80)}`);
    return { providerMessageId: `mock-${this.sent.length}` };
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage {
    const p = (payload ?? {}) as Record<string, unknown>;
    return {
      from: String(p.From ?? p.from ?? ""),
      to: String(p.To ?? p.to ?? ""),
      body: String(p.Body ?? p.body ?? ""),
      providerMessageId: p.MessageSid ? String(p.MessageSid) : null,
      timestamp: new Date(),
      raw: payload,
    };
  }

  async handleIncomingMessage(payload: unknown): Promise<NormalizedWhatsAppMessage> {
    return this.normalizeIncomingMessage(payload);
  }

  /** Limpa o histórico — usado entre testes. */
  reset() {
    this.sent.length = 0;
  }
}
