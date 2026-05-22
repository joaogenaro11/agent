"use server";

import { revalidatePath } from "next/cache";
import { DateTime } from "luxon";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import {
  cancelReminder,
  completeReminder,
  createReminder,
  postponeReminder,
  rolloverRecurringReminder,
} from "@/server/services/reminders";

const reminderInput = z.object({
  title: z.string().min(1, "Informe um título"),
  description: z.string().optional().default(""),
  category: z.string().optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueAt: z.string().min(1, "Informe data e hora"),
  hasSpecificTime: z.boolean().default(true),
  recurrenceType: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]).default("NONE"),
  channel: z.enum(["WHATSAPP", "WEB", "BOTH"]).default("WHATSAPP"),
});

export type ReminderActionState = { ok: boolean; error?: string };

/** Converte a string de <input datetime-local> para Date no fuso do usuário. */
function parseLocalDateTime(value: string, tz: string): Date {
  const dt = DateTime.fromISO(value, { zone: tz });
  return dt.isValid ? dt.toJSDate() : new Date(value);
}

export async function createReminderAction(
  input: z.input<typeof reminderInput>,
): Promise<ReminderActionState> {
  const parsed = reminderInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const data = parsed.data;

  await createReminder({
    userId: user.id,
    title: data.title,
    description: data.description || null,
    category: data.category || null,
    priority: data.priority,
    dueAt: parseLocalDateTime(data.dueAt, tz),
    hasSpecificTime: data.hasSpecificTime,
    recurrenceType: data.recurrenceType,
    channel: data.channel,
    source: "WEB",
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateReminderAction(
  id: string,
  input: z.input<typeof reminderInput>,
): Promise<ReminderActionState> {
  const parsed = reminderInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const data = parsed.data;

  await prisma.reminder.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      category: data.category || null,
      priority: data.priority,
      dueAt: parseLocalDateTime(data.dueAt, tz),
      hasSpecificTime: data.hasSpecificTime,
      recurrenceType: data.recurrenceType,
      channel: data.channel,
    },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteReminderAction(id: string): Promise<ReminderActionState> {
  await prisma.reminder.delete({ where: { id } });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function completeReminderAction(id: string): Promise<ReminderActionState> {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const reminder = await completeReminder(id);
  await rolloverRecurringReminder(reminder, tz);
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function cancelReminderAction(id: string): Promise<ReminderActionState> {
  await cancelReminder(id);
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function postponeReminderAction(
  id: string,
  hours: number,
): Promise<ReminderActionState> {
  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) return { ok: false, error: "Lembrete não encontrado" };
  await postponeReminder(id, new Date(reminder.dueAt.getTime() + hours * 3600_000));
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return { ok: true };
}
