import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { logHabit } from "@/server/services/habits";
import { createTestUser, deleteTestUser } from "./helpers";

const TZ = "America/Sao_Paulo";

describe("Registro de água (hábito numérico)", () => {
  let userId: string;

  afterEach(async () => {
    if (userId) await deleteTestUser(userId);
  });

  it("acumula o valor a cada registro e marca conclusão ao bater a meta", async () => {
    const user = await createTestUser();
    userId = user.id;

    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: "Água",
        type: "NUMERIC",
        targetValue: 3000,
        unit: "ml",
      },
    });

    const first = await logHabit(user.id, habit, TZ, { value: 750 });
    expect(first.log.value).toBe(750);
    expect(first.log.completed).toBe(false);

    const second = await logHabit(user.id, habit, TZ, { value: 750 });
    expect(second.log.value).toBe(1500);
    expect(second.log.completed).toBe(false);

    const third = await logHabit(user.id, habit, TZ, { value: 1500 });
    expect(third.log.value).toBe(3000);
    expect(third.log.completed).toBe(true);
  });
});
