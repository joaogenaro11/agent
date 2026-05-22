import { PageHeader } from "@/components/page-header";
import { RemindersView } from "@/components/reminders/reminders-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { dueAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Lembretes"
        description="Crie, edite e acompanhe seus lembretes. Os disparos vão para o WhatsApp no horário definido."
      />
      <RemindersView reminders={reminders} timezone={tz} />
    </div>
  );
}
