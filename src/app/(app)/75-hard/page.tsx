import { PageHeader } from "@/components/page-header";
import { Hard75View } from "@/components/hard75/hard75-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { dayRange, nowInZone } from "@/lib/datetime";
import { currentDay } from "@/server/services/hard75";

export const dynamic = "force-dynamic";

export default async function Hard75Page() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const date = dayRange(nowInZone(tz)).start;

  const challenge = await prisma.hard75Challenge.findFirst({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "desc" },
  });
  const log = challenge
    ? await prisma.hard75DailyLog.findUnique({
        where: { challengeId_date: { challengeId: challenge.id, date } },
      })
    : null;

  return (
    <div>
      <PageHeader
        title="75 Hard"
        description="Checklist diário do desafio. Você também pode registrar pelo WhatsApp."
      />
      <Hard75View
        challenge={challenge}
        log={log}
        day={challenge ? currentDay(challenge, tz) : 0}
      />
    </div>
  );
}
