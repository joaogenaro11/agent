import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { deliverScheduledMessage } from "@/server/services/messaging/delivery";
import { createTestUser, deleteTestUser } from "./helpers";

describe("Scheduler — deduplicação de envio", () => {
  let userId: string;

  afterEach(async () => {
    if (userId) await deleteTestUser(userId);
  });

  it("não envia o mesmo disparo duas vezes", async () => {
    const user = await createTestUser();
    userId = user.id;

    const req = {
      userId: user.id,
      to: user.phone,
      body: "Lembrete de teste",
      type: "reminder",
      relatedEntityType: "reminder",
      relatedEntityId: "rem-fixo-123",
      scheduledFor: new Date("2026-05-22T12:00:00Z"),
    };

    const first = await deliverScheduledMessage(req);
    const second = await deliverScheduledMessage(req);

    expect(first.status).toBe("sent");
    expect(second.status).toBe("skipped");

    const logs = await prisma.messageDeliveryLog.findMany({
      where: { userId: user.id, relatedEntityId: "rem-fixo-123" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
  });

  it("permite disparos em ocorrências diferentes da mesma entidade", async () => {
    const user = await createTestUser();
    userId = user.id;

    const base = {
      userId: user.id,
      to: user.phone,
      body: "Rotina diária",
      type: "routine",
      relatedEntityType: "routine",
      relatedEntityId: "rot-1",
    };

    const day1 = await deliverScheduledMessage({
      ...base,
      scheduledFor: new Date("2026-05-22T09:00:00Z"),
    });
    const day2 = await deliverScheduledMessage({
      ...base,
      scheduledFor: new Date("2026-05-23T09:00:00Z"),
    });

    expect(day1.status).toBe("sent");
    expect(day2.status).toBe("sent");
  });
});
