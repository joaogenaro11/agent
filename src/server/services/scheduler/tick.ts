import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import {
  atTimeOnDate,
  isWithinQuietHours,
  jsWeekday,
  nowInZone,
} from "@/lib/datetime";
import type { UserWithSettings } from "@/lib/current-user";
import {
  composeDevotional,
  composeHabitMessage,
  composeMotivational,
  composeReminderMessage,
  composeScheduledMessage,
} from "@/server/services/ai/message-composer";
import { deliverScheduledMessage } from "@/server/services/messaging/delivery";

const log = createLogger("scheduler:tick");

export interface TickResult {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Varre lembretes, mensagens programadas, rotinas e hábitos pendentes de
 * disparo. Respeita fuso e quiet hours. A deduplicação fica em
 * deliverScheduledMessage (índice único de MessageDeliveryLog).
 *
 * Quiet hours: se o disparo cairia dentro da janela, é simplesmente adiado —
 * a condição de disparo é `>=`, então um tick posterior (fora da janela)
 * envia a mesma ocorrência, mantendo a chave de deduplicação.
 */
export async function runSchedulerTick(): Promise<TickResult> {
  const result: TickResult = { checked: 0, sent: 0, skipped: 0, failed: 0 };
  const users = await prisma.user.findMany({ include: { settings: true } });

  for (const user of users) {
    await processUser(user, result);
  }

  log.info(
    `tick concluído — verificados ${result.checked}, enviados ${result.sent}, ignorados ${result.skipped}, falhas ${result.failed}`,
  );
  return result;
}

async function processUser(user: UserWithSettings, result: TickResult) {
  const tz = user.settings?.timezone ?? user.timezone;
  const now = nowInZone(tz);
  const quietStart = user.settings?.quietHoursStart ?? "22:00";
  const quietEnd = user.settings?.quietHoursEnd ?? "07:00";
  const inQuietHours = isWithinQuietHours(now, quietStart, quietEnd);
  const weekday = jsWeekday(now);
  const to = user.phone;

  const record = async (
    body: string,
    type: string,
    entityType: string,
    entityId: string,
    scheduledFor: Date,
  ) => {
    result.checked += 1;
    if (inQuietHours) {
      result.skipped += 1;
      return;
    }
    const r = await deliverScheduledMessage({
      userId: user.id,
      to,
      body,
      type,
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      scheduledFor,
    });
    if (r.status === "sent") result.sent += 1;
    else if (r.status === "skipped") result.skipped += 1;
    else result.failed += 1;
  };

  // --- Lembretes vencidos e pendentes ---
  const reminders = await prisma.reminder.findMany({
    where: {
      userId: user.id,
      status: { in: ["PENDING", "POSTPONED"] },
      dueAt: { lte: now.toJSDate() },
      channel: { in: ["WHATSAPP", "BOTH"] },
    },
  });
  for (const reminder of reminders) {
    let body: string;
    if (reminder.category === "devocional") {
      body = await composeDevotional(user, { theme: reminder.title });
    } else if (reminder.category === "motivacional") {
      body = await composeMotivational(user, { theme: reminder.title });
    } else {
      body = await composeReminderMessage(user, reminder);
    }
    await record(body, "reminder", "reminder", reminder.id, reminder.dueAt);
  }

  // --- Mensagens programadas ---
  const scheduled = await prisma.scheduledMessage.findMany({
    where: { userId: user.id, active: true },
  });
  for (const msg of scheduled) {
    if (!shouldFireToday(msg.weekdays, weekday)) continue;
    const fireAt = atTimeOnDate(now, msg.time);
    if (now < fireAt) continue;
    const body = await composeScheduledMessage(user, msg.type, {
      title: msg.title,
      basePrompt: msg.basePrompt,
    });
    await record(body, "scheduled_message", "scheduled_message", msg.id, fireAt.toJSDate());
  }

  // --- Rotinas ativas ---
  const routines = await prisma.routine.findMany({
    where: { userId: user.id, active: true },
  });
  for (const routine of routines) {
    if (!shouldFireToday(routine.weekdays, weekday)) continue;
    const fireAt = atTimeOnDate(now, routine.time);
    if (now < fireAt) continue;
    const body = await composeRoutineBody(user, routine.type, routine.name, routine.baseContent);
    await record(body, "routine", "routine", routine.id, fireAt.toJSDate());
  }

  // --- Cobrança de hábitos ---
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, active: true, reminderTime: { not: null } },
  });
  for (const habit of habits) {
    if (!shouldFireToday(habit.activeDays, weekday)) continue;
    if (!habit.reminderTime) continue;
    const fireAt = atTimeOnDate(now, habit.reminderTime);
    if (now < fireAt) continue;
    const todayStart = now.startOf("day").toUTC().toJSDate();
    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: habit.id, date: todayStart } },
    });
    if (existing?.completed) continue;
    const body = await composeHabitMessage(user, habit);
    await record(body, "habit", "habit", habit.id, fireAt.toJSDate());
  }
}

function shouldFireToday(weekdays: number[], today: number): boolean {
  return weekdays.length === 0 || weekdays.includes(today);
}

async function composeRoutineBody(
  user: UserWithSettings,
  type: string,
  name: string,
  baseContent: string,
): Promise<string> {
  switch (type) {
    case "MOTIVACIONAL":
      return composeMotivational(user, { basePrompt: baseContent });
    case "DEVOCIONAL":
      return composeDevotional(user, { theme: baseContent || name });
    default: {
      const display = user.settings?.userDisplayName ?? user.name;
      return baseContent
        ? `${display}, ${baseContent}`
        : `${display}, lembrete da rotina: ${name}.`;
    }
  }
}
