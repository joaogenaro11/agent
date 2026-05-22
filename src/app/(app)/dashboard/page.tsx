import { DateTime } from "luxon";
import {
  Bell,
  AlertTriangle,
  Droplet,
  Flame,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { dayRange, nowInZone, jsWeekday } from "@/lib/datetime";
import { listOverdue, listToday, listUpcoming } from "@/server/services/reminders";
import { todayHabits } from "@/server/services/habits";
import { currentDay } from "@/server/services/hard75";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const now = nowInZone(tz);
  const { start } = dayRange(now);
  const weekday = jsWeekday(now);

  const [todayReminders, upcoming, overdue, habits, challenge, scheduled] =
    await Promise.all([
      listToday(user.id, tz),
      listUpcoming(user.id, tz, 5),
      listOverdue(user.id, tz),
      todayHabits(user.id, tz),
      prisma.hard75Challenge.findFirst({ where: { userId: user.id, active: true } }),
      prisma.scheduledMessage.findMany({ where: { userId: user.id, active: true } }),
    ]);

  const hard75Log = challenge
    ? await prisma.hard75DailyLog.findUnique({
        where: { challengeId_date: { challengeId: challenge.id, date: start } },
      })
    : null;

  const scheduledToday = scheduled.filter(
    (m) => m.weekdays.length === 0 || m.weekdays.includes(weekday),
  );
  const habitsDone = habits.filter((h) => h.log?.completed).length;
  const water = hard75Log?.waterMl ?? 0;
  const waterTarget = challenge?.targetWaterMl ?? 3000;

  const stats = [
    { label: "Lembretes hoje", value: todayReminders.length, icon: Bell },
    { label: "Atrasados", value: overdue.length, icon: AlertTriangle },
    {
      label: "Água",
      value: `${water}/${waterTarget}ml`,
      icon: Droplet,
    },
    {
      label: "Hábitos",
      value: `${habitsDone}/${habits.length}`,
      icon: CheckCircle2,
    },
  ];

  return (
    <div>
      <PageHeader
        title={`Olá, ${user.settings?.userDisplayName ?? user.name}`}
        description={now.setLocale("pt-BR").toFormat("cccc, dd 'de' LLLL 'de' yyyy")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Ações rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickActions />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Lembretes de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayReminders.length === 0 && (
              <p className="text-sm text-muted-foreground">Nada para hoje.</p>
            )}
            {todayReminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.title}</span>
                <span className="text-muted-foreground">
                  {DateTime.fromJSDate(r.dueAt).setZone(tz).toFormat("HH:mm")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Próximos lembretes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem lembretes futuros.</p>
            )}
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.title}</span>
                <span className="text-muted-foreground">
                  {DateTime.fromJSDate(r.dueAt).setZone(tz).toFormat("dd/MM HH:mm")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {overdue.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" /> Pendências atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdue.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.title}</span>
                  <span className="text-muted-foreground">
                    {DateTime.fromJSDate(r.dueAt).setZone(tz).toFormat("dd/MM HH:mm")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Hábitos do dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {habits.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem hábitos ativos.</p>
            )}
            {habits.map(({ habit, log }) => (
              <div key={habit.id} className="flex items-center justify-between text-sm">
                <span>{habit.name}</span>
                {habit.type === "NUMERIC" && habit.targetValue ? (
                  <Badge variant={log?.completed ? "success" : "secondary"}>
                    {log?.value ?? 0}/{habit.targetValue} {habit.unit}
                  </Badge>
                ) : (
                  <Badge variant={log?.completed ? "success" : "secondary"}>
                    {log?.completed ? "Feito" : "Pendente"}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4" /> 75 Hard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {challenge ? (
              <div className="space-y-2 text-sm">
                <p>
                  Dia <strong>{currentDay(challenge, tz)}</strong> de{" "}
                  {challenge.durationDays}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <span>{hard75Log?.workout1 ? "✅" : "❌"} Treino 1</span>
                  <span>{hard75Log?.workout2 ? "✅" : "❌"} Treino 2</span>
                  <span>{hard75Log?.readingDone ? "✅" : "❌"} Leitura</span>
                  <span>{hard75Log?.dietDone ? "✅" : "❌"} Dieta</span>
                  <span>{hard75Log?.progressPhoto ? "✅" : "❌"} Foto</span>
                  <span>{water >= waterTarget ? "✅" : "❌"} Água</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum desafio ativo.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Mensagens de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scheduledToday.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem programada para hoje.
              </p>
            )}
            {scheduledToday.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.title}</span>
                <span className="text-muted-foreground">{m.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
