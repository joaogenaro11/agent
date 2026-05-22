import { describe, it, expect, vi } from "vitest";

// Sem OPENAI_API_KEY o composer usa templates; só precisamos do histórico vazio.
vi.mock("@/lib/db", () => ({
  prisma: {
    messageDeliveryLog: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import {
  composeMotivational,
  composeReminderMessage,
} from "@/server/services/ai/message-composer";
import type { UserWithSettings } from "@/lib/current-user";
import type { Reminder } from "@prisma/client";

function fakeUser(allowEmojis = true): UserWithSettings {
  return {
    id: "u1",
    name: "Genaro",
    email: "g@example.com",
    phone: "+55",
    timezone: "America/Sao_Paulo",
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {
      id: "s1",
      userId: "u1",
      assistantName: "Nexus",
      userDisplayName: "Genaro",
      tone: "DIRETO",
      accountabilityLevel: "ALTO",
      messageLength: "MEDIA",
      allowSpiritualContent: true,
      motivationalStyle: "",
      devotionalStyle: "",
      forbiddenTopics: [],
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "America/Sao_Paulo",
      allowEmojis,
      currentMode: "NORMAL",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe("MessageComposer (modo template, sem IA)", () => {
  it("gera mensagem motivacional personalizada com o nome do usuário", async () => {
    const text = await composeMotivational(fakeUser());
    expect(text.length).toBeGreaterThan(10);
    expect(text).toContain("Genaro");
  });

  it("gera mensagem de lembrete mencionando o título", async () => {
    const reminder = {
      title: "Comprar leite",
      description: null,
      priority: "MEDIUM",
    } as Reminder;
    const text = await composeReminderMessage(fakeUser(), reminder);
    expect(text.toLowerCase()).toContain("comprar leite");
  });

  it("remove emojis quando o usuário desativa", async () => {
    const text = await composeMotivational(fakeUser(false));
    expect(/\p{Emoji_Presentation}/u.test(text)).toBe(false);
  });
});
