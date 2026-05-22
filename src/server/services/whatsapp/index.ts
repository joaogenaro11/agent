import { env } from "@/lib/env";
import { MockWhatsAppProvider } from "./mock-provider";
import { TwilioWhatsAppProvider } from "./twilio-provider";
import { MetaWhatsAppProvider } from "./meta-provider";
import { TwilioBusinessWhatsAppProvider } from "./twilio-business-provider";
import type { WhatsAppProvider } from "./types";

export type { WhatsAppProvider, NormalizedWhatsAppMessage, SendResult } from "./types";
export { MockWhatsAppProvider } from "./mock-provider";
export { TwilioWhatsAppProvider } from "./twilio-provider";

let cached: WhatsAppProvider | null = null;

/**
 * Factory do provedor ativo, definido por WHATSAPP_PROVIDER.
 * O resto do sistema depende apenas da interface WhatsAppProvider.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (cached) return cached;
  switch (env.WHATSAPP_PROVIDER) {
    case "twilio":
      cached = new TwilioWhatsAppProvider();
      break;
    case "meta":
      cached = new MetaWhatsAppProvider();
      break;
    case "twilio_business":
      cached = new TwilioBusinessWhatsAppProvider();
      break;
    case "mock":
    default:
      cached = new MockWhatsAppProvider();
      break;
  }
  return cached;
}

/** Permite injetar um provedor (usado em testes). */
export function setWhatsAppProvider(provider: WhatsAppProvider | null) {
  cached = provider;
}
