import type {
  NormalizedWhatsAppMessage,
  SendResult,
  WhatsAppProvider,
} from "./types";

/**
 * STUB — Meta WhatsApp Cloud API.
 *
 * Estrutura preparada para a migração futura descrita no README. A Cloud API
 * exige: token permanente, phone number ID, templates aprovados e respeito à
 * janela de conversa de 24h (mensagens livres só após uma mensagem do usuário;
 * fora da janela, apenas templates aprovados).
 *
 * Implementar `sendMessage` via POST em
 * https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";

  async sendMessage(_to: string, _message: string): Promise<SendResult> {
    throw new Error(
      "MetaWhatsAppProvider ainda não implementado. Veja a seção de migração no README.",
    );
  }

  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage {
    // Cloud API: entry[].changes[].value.messages[] — formato a mapear no futuro.
    return {
      from: "",
      to: "",
      body: "",
      providerMessageId: null,
      timestamp: new Date(),
      raw: payload,
    };
  }

  async handleIncomingMessage(): Promise<NormalizedWhatsAppMessage> {
    throw new Error("MetaWhatsAppProvider ainda não implementado.");
  }
}
