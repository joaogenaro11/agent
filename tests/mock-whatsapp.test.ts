import { describe, it, expect, beforeEach } from "vitest";
import { MockWhatsAppProvider } from "@/server/services/whatsapp/mock-provider";

describe("MockWhatsAppProvider", () => {
  let provider: MockWhatsAppProvider;

  beforeEach(() => {
    provider = new MockWhatsAppProvider();
  });

  it("registra mensagens enviadas em memória", async () => {
    await provider.sendMessage("+5511999999999", "Olá");
    await provider.sendMessage("+5511999999999", "Tudo bem?");
    expect(provider.sent).toHaveLength(2);
    expect(provider.sent[0].body).toBe("Olá");
    expect(provider.sent[1].to).toBe("+5511999999999");
  });

  it("retorna um id de mensagem do provedor", async () => {
    const result = await provider.sendMessage("+5511999999999", "teste");
    expect(result.providerMessageId).toBeTruthy();
  });

  it("normaliza payload de mensagem recebida", () => {
    const normalized = provider.normalizeIncomingMessage({
      From: "whatsapp:+5511999999999",
      To: "whatsapp:+14155238886",
      Body: "Bebi 500ml",
      MessageSid: "SM123",
    });
    expect(normalized.from).toBe("whatsapp:+5511999999999");
    expect(normalized.body).toBe("Bebi 500ml");
    expect(normalized.providerMessageId).toBe("SM123");
  });

  it("limpa o histórico no reset", async () => {
    await provider.sendMessage("+55", "x");
    provider.reset();
    expect(provider.sent).toHaveLength(0);
  });
});
