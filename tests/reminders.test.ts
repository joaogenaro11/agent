import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { createReminder, listToday } from "@/server/services/reminders";
import { createTestUser, deleteTestUser } from "./helpers";

describe("Lembretes — serviço de domínio", () => {
  let userId: string;

  afterEach(async () => {
    if (userId) await deleteTestUser(userId);
  });

  it("cria um lembrete com status pendente", async () => {
    const user = await createTestUser();
    userId = user.id;

    const reminder = await createReminder({
      userId: user.id,
      title: "Comprar leite",
      dueAt: new Date(),
      source: "WHATSAPP",
    });

    expect(reminder.id).toBeTruthy();
    expect(reminder.status).toBe("PENDING");
    expect(reminder.source).toBe("WHATSAPP");

    const fromDb = await prisma.reminder.findUnique({ where: { id: reminder.id } });
    expect(fromDb?.title).toBe("Comprar leite");
  });

  it("lista lembretes do dia atual", async () => {
    const user = await createTestUser();
    userId = user.id;

    await createReminder({ userId: user.id, title: "Hoje", dueAt: new Date() });
    await createReminder({
      userId: user.id,
      title: "Semana que vem",
      dueAt: new Date(Date.now() + 7 * 86400_000),
    });

    const today = await listToday(user.id, "America/Sao_Paulo");
    expect(today.map((r) => r.title)).toContain("Hoje");
    expect(today.map((r) => r.title)).not.toContain("Semana que vem");
  });
});
