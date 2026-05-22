import { prisma } from "@/lib/db";
import { dayRange, nextRecurrence, nowInZone, toZoned } from "@/lib/datetime";
import type { Channel, Priority, RecurrenceType, Reminder, ReminderSource } from "@prisma/client";

export interface CreateReminderInput {
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority?: Priority;
  dueAt: Date;
  hasSpecificTime?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceRule?: string | null;
  reminderOffsets?: number[];
  channel?: Channel;
  source?: ReminderSource;
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  return prisma.reminder.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      priority: input.priority ?? "MEDIUM",
      dueAt: input.dueAt,
      hasSpecificTime: input.hasSpecificTime ?? true,
      recurrenceType: input.recurrenceType ?? "NONE",
      recurrenceRule: input.recurrenceRule ?? null,
      reminderOffsets: input.reminderOffsets ?? [],
      channel: input.channel ?? "WHATSAPP",
      source: input.source ?? "WEB",
    },
  });
}

/** Busca um lembrete pendente cujo título corresponda ao texto informado. */
export async function findReminderByQuery(
  userId: string,
  query: string,
): Promise<Reminder | null> {
  const cleaned = query.trim();
  const direct = await prisma.reminder.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "POSTPONED"] },
      title: { contains: cleaned, mode: "insensitive" },
    },
    orderBy: { dueAt: "asc" },
  });
  if (direct) return direct;

  // Tenta por palavra-chave mais longa do texto.
  const word = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort((a, b) => b.length - a.length)[0];
  if (!word) return null;
  return prisma.reminder.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "POSTPONED"] },
      title: { contains: word, mode: "insensitive" },
    },
    orderBy: { dueAt: "asc" },
  });
}

export async function completeReminder(id: string): Promise<Reminder> {
  return prisma.reminder.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function postponeReminder(id: string, newDueAt: Date): Promise<Reminder> {
  return prisma.reminder.update({
    where: { id },
    data: { status: "POSTPONED", dueAt: newDueAt },
  });
}

export async function cancelReminder(id: string): Promise<Reminder> {
  return prisma.reminder.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

/** Lembretes com vencimento no dia atual (fuso do usuário). */
export async function listToday(userId: string, tz: string): Promise<Reminder[]> {
  const { start, end } = dayRange(nowInZone(tz));
  return prisma.reminder.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "POSTPONED"] },
      dueAt: { gte: start, lte: end },
    },
    orderBy: { dueAt: "asc" },
  });
}

/** Lembretes vencidos e ainda pendentes. */
export async function listOverdue(userId: string, tz: string): Promise<Reminder[]> {
  const { start } = dayRange(nowInZone(tz));
  return prisma.reminder.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "POSTPONED"] },
      dueAt: { lt: start },
    },
    orderBy: { dueAt: "asc" },
  });
}

/** Próximos lembretes a partir de agora. */
export async function listUpcoming(
  userId: string,
  tz: string,
  take = 5,
): Promise<Reminder[]> {
  return prisma.reminder.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "POSTPONED"] },
      dueAt: { gt: nowInZone(tz).toJSDate() },
    },
    orderBy: { dueAt: "asc" },
    take,
  });
}

/**
 * Ao concluir um lembrete recorrente, agenda a próxima ocorrência.
 * Mantém a recorrência viva sem depender de RRULE completo.
 */
export async function rolloverRecurringReminder(
  reminder: Reminder,
  tz: string,
): Promise<Reminder | null> {
  if (reminder.recurrenceType === "NONE") return null;
  const next = nextRecurrence(toZoned(reminder.dueAt, tz), reminder.recurrenceType);
  if (!next) return null;
  return prisma.reminder.create({
    data: {
      userId: reminder.userId,
      title: reminder.title,
      description: reminder.description,
      category: reminder.category,
      priority: reminder.priority,
      dueAt: next.toJSDate(),
      hasSpecificTime: reminder.hasSpecificTime,
      recurrenceType: reminder.recurrenceType,
      recurrenceRule: reminder.recurrenceRule,
      reminderOffsets: reminder.reminderOffsets,
      channel: reminder.channel,
      source: reminder.source,
    },
  });
}
