"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { findHabitByName, logHabit } from "@/server/services/habits";
import { syncFromHabit } from "@/server/services/hard75";

const habitInput = z.object({
  name: z.string().min(1, "Informe um nome"),
  description: z.string().optional().default(""),
  type: z.enum(["BOOLEAN", "NUMERIC", "CHECKLIST"]).default("BOOLEAN"),
  targetValue: z.number().nullable().optional(),
  unit: z.string().optional().default(""),
  activeDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  reminderTime: z.string().optional().default(""),
  active: z.boolean().default(true),
});

export type ActionState = { ok: boolean; error?: string; message?: string };

function revalidateHabits() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
}

export async function createHabitAction(
  input: z.input<typeof habitInput>,
): Promise<ActionState> {
  const parsed = habitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const user = await getCurrentUser();
  const d = parsed.data;
  await prisma.habit.create({
    data: {
      userId: user.id,
      name: d.name,
      description: d.description || null,
      type: d.type,
      targetValue: d.targetValue ?? null,
      unit: d.unit || null,
      activeDays: d.activeDays,
      reminderTime: d.reminderTime || null,
      active: d.active,
    },
  });
  revalidateHabits();
  return { ok: true };
}

export async function updateHabitAction(
  id: string,
  input: z.input<typeof habitInput>,
): Promise<ActionState> {
  const parsed = habitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  await prisma.habit.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description || null,
      type: d.type,
      targetValue: d.targetValue ?? null,
      unit: d.unit || null,
      activeDays: d.activeDays,
      reminderTime: d.reminderTime || null,
      active: d.active,
    },
  });
  revalidateHabits();
  return { ok: true };
}

export async function deleteHabitAction(id: string): Promise<ActionState> {
  await prisma.habit.delete({ where: { id } });
  revalidateHabits();
  return { ok: true };
}

/** Registra progresso de um hábito (uso no painel de hábitos). */
export async function logHabitAction(
  habitId: string,
  input: { value?: number | null; completed?: boolean | null },
): Promise<ActionState> {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) return { ok: false, error: "Hábito não encontrado" };
  await logHabit(user.id, habit, tz, input);
  await syncFromHabit(user.id, tz, habit.name, input);
  revalidateHabits();
  return { ok: true };
}

/** Registra progresso por nome — usado pelas ações rápidas do dashboard. */
export async function quickLogByNameAction(
  name: string,
  input: { value?: number | null; completed?: boolean | null },
): Promise<ActionState> {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const habit = await findHabitByName(user.id, name);
  if (habit) await logHabit(user.id, habit, tz, input);
  await syncFromHabit(user.id, tz, name, input);
  revalidateHabits();
  if (!habit) return { ok: true, message: "Registrado no 75 Hard." };
  return { ok: true, message: "Registrado." };
}
