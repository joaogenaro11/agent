import { prisma } from "@/lib/db";
import { nowInZone } from "@/lib/datetime";
import type { UserWithSettings } from "@/lib/current-user";

/** Contexto do usuário entregue à IA para interpretar comandos e compor mensagens. */
export interface AssistantContext {
  user: UserWithSettings;
  timezone: string;
  nowISO: string;
  upcomingReminders: { id: string; title: string; dueAt: string }[];
  activeHabits: { id: string; name: string; type: string }[];
}

/** Monta o contexto atual do usuário a partir do banco. */
export async function buildContext(user: UserWithSettings): Promise<AssistantContext> {
  const timezone = user.settings?.timezone ?? user.timezone;
  const now = nowInZone(timezone);

  const [reminders, habits] = await Promise.all([
    prisma.reminder.findMany({
      where: { userId: user.id, status: "PENDING" },
      orderBy: { dueAt: "asc" },
      take: 10,
    }),
    prisma.habit.findMany({
      where: { userId: user.id, active: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    user,
    timezone,
    nowISO: now.toISO() ?? new Date().toISOString(),
    upcomingReminders: reminders.map((r) => ({
      id: r.id,
      title: r.title,
      dueAt: r.dueAt.toISOString(),
    })),
    activeHabits: habits.map((h) => ({ id: h.id, name: h.name, type: h.type })),
  };
}
