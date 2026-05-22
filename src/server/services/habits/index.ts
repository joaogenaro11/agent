import { prisma } from "@/lib/db";
import { dayRange, nowInZone } from "@/lib/datetime";
import type { Habit, HabitLog } from "@prisma/client";

/** Normaliza texto para comparação (sem acentos, minúsculo). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Encontra um hábito ativo pelo nome, tolerando acentos e variações. */
export async function findHabitByName(
  userId: string,
  name: string,
): Promise<Habit | null> {
  const habits = await prisma.habit.findMany({ where: { userId, active: true } });
  const target = normalize(name);
  return (
    habits.find((h) => normalize(h.name) === target) ??
    habits.find((h) => normalize(h.name).includes(target) || target.includes(normalize(h.name))) ??
    null
  );
}

/** Início do dia (UTC) para a data atual no fuso informado. */
function todayDate(tz: string): Date {
  return dayRange(nowInZone(tz)).start;
}

export interface LogHabitResult {
  habit: Habit;
  log: HabitLog;
}

/**
 * Registra progresso de um hábito no dia atual.
 * Hábitos numéricos acumulam `value`; booleanos marcam `completed`.
 */
export async function logHabit(
  userId: string,
  habit: Habit,
  tz: string,
  input: { value?: number | null; completed?: boolean | null; notes?: string | null },
): Promise<LogHabitResult> {
  const date = todayDate(tz);
  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId: habit.id, date } },
  });

  let value = existing?.value ?? 0;
  if (typeof input.value === "number") {
    value = habit.type === "NUMERIC" ? value + input.value : input.value;
  }

  let completed = existing?.completed ?? false;
  if (habit.type === "NUMERIC") {
    completed = habit.targetValue ? value >= habit.targetValue : value > 0;
  } else if (typeof input.completed === "boolean") {
    completed = input.completed;
  } else {
    completed = true;
  }

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: habit.id, date } },
    create: { habitId: habit.id, userId, date, value, completed, notes: input.notes ?? null },
    update: { value, completed, notes: input.notes ?? existing?.notes ?? null },
  });

  return { habit, log };
}

/** Hábitos ativos do dia, com o log do dia (se houver). */
export async function todayHabits(userId: string, tz: string) {
  const date = todayDate(tz);
  const weekday = nowInZone(tz).weekday % 7;
  const habits = await prisma.habit.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
  const logs = await prisma.habitLog.findMany({ where: { userId, date } });
  const byHabit = new Map(logs.map((l) => [l.habitId, l]));

  return habits
    .filter((h) => h.activeDays.length === 0 || h.activeDays.includes(weekday))
    .map((habit) => ({ habit, log: byHabit.get(habit.id) ?? null }));
}

/** Texto de status dos hábitos do dia. */
export async function formatHabitStatus(userId: string, tz: string): Promise<string> {
  const items = await todayHabits(userId, tz);
  if (items.length === 0) return "Você ainda não tem hábitos ativos configurados.";
  const lines = items.map(({ habit, log }) => {
    const done = log?.completed ?? false;
    const mark = done ? "✅" : "⬜";
    if (habit.type === "NUMERIC" && habit.targetValue) {
      return `${mark} ${habit.name}: ${log?.value ?? 0}/${habit.targetValue} ${habit.unit ?? ""}`.trim();
    }
    return `${mark} ${habit.name}`;
  });
  return `Hábitos de hoje:\n${lines.join("\n")}`;
}
