import { TwilioWhatsAppProvider } from "./twilio-provider";

/**
 * STUB — Twilio WhatsApp Business (número oficial aprovado).
 *
 * A API é a mesma do Twilio Sandbox; a diferença é operacional:
 * número aprovado, templates de mensagem (Content API) e janela de 24h.
 * Por isso herda de TwilioWhatsAppProvider — o ponto de extensão futuro é
 * o envio de templates aprovados fora da janela de conversa.
 */
export class TwilioBusinessWhatsAppProvider extends TwilioWhatsAppProvider {
  readonly name = "twilio_business";

  /** Futuro: enviar template aprovado via Content SID. */
  async sendTemplate(_to: string, _contentSid: string): Promise<void> {
    throw new Error(
      "Envio de templates aprovados ainda não implementado. Veja o README.",
    );
  }
}
