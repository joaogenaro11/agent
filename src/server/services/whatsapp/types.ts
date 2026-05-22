/** Mensagem de WhatsApp normalizada, independente do provedor. */
export interface NormalizedWhatsAppMessage {
  from: string;
  to: string;
  body: string;
  providerMessageId: string | null;
  timestamp: Date;
  raw: unknown;
}

/** Resultado de um envio. */
export interface SendResult {
  providerMessageId: string | null;
}

/**
 * Contrato comum a todos os provedores de WhatsApp.
 * Trocar de provedor (Twilio Sandbox -> Meta Cloud API -> Twilio Business)
 * significa apenas implementar esta interface e ajustar a factory.
 */
export interface WhatsAppProvider {
  readonly name: string;
  sendMessage(to: string, message: string): Promise<SendResult>;
  normalizeIncomingMessage(payload: unknown): NormalizedWhatsAppMessage;
  handleIncomingMessage(payload: unknown): Promise<NormalizedWhatsAppMessage>;
}
