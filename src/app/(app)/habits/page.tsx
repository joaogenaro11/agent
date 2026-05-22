import { PageHeader } from "@/components/page-header";
import { HabitsView } from "@/components/habits/habits-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { dayRange, nowInZone } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const date = dayRange(nowInZone(tz)).start;

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const logs = await prisma.habitLog.findMany({ where: { userId: user.id, date } });
  const byHabit = new Map(logs.map((l) => [l.habitId, l]));
  const items = habits.map((habit) => ({ habit, log: byHabit.get(habit.id) ?? null }));

  return (
    <div>
      <PageHeader
        title="Hábitos"
        description="Configure hábitos do tipo sim/não, numéricos ou checklist. O assistente cobra no horário definido."
      />
      <HabitsView items={items} />
    </div>
  );
}
