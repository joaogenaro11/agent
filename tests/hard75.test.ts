import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { formatHard75Status, syncFromHabit } from "@/server/services/hard75";
import { createTestUser, deleteTestUser } from "./helpers";

const TZ = "America/Sao_Paulo";

describe("75 Hard — sincronização e status", () => {
  let userId: string;

  afterEach(async () => {
    if (userId) await deleteTestUser(userId);
  });

  it("aplica registros de hábito ao log diário e gera o status", async () => {
    const user = await createTestUser();
    userId = user.id;

    await prisma.hard75Challenge.create({
      data: {
        userId: user.id,
        startDate: new Date(),
        targetWaterMl: 3000,
        targetPages: 10,
        active: true,
      },
    });

    const water = await syncFromHabit(user.id, TZ, "água", { value: 1500 });
    expect(water?.log.waterMl).toBe(1500);

    const workout = await syncFromHabit(user.id, TZ, "treino 1", { completed: true });
    expect(workout?.log.workout1).toBe(true);

    const status = await formatHard75Status(user.id, TZ);
    expect(status).toContain("1500ml/3000ml");
    expect(status).toContain("Treino 1");
  });

  it("ignora hábitos sem desafio ativo", async () => {
    const user = await createTestUser();
    userId = user.id;
    const result = await syncFromHabit(user.id, TZ, "água", { value: 500 });
    expect(result).toBeNull();
  });
});
