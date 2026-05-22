import { PageHeader } from "@/components/page-header";
import { ScheduledMessagesView } from "@/components/scheduled/scheduled-messages-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function ScheduledMessagesPage() {
  const user = await getCurrentUser();
  const messages = await prisma.scheduledMessage.findMany({
    where: { userId: user.id },
    orderBy: { time: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Mensagens programadas"
        description="Mensagens recorrentes — motivacionais, devocionais, cobranças, revisão e planejamento do dia."
      />
      <ScheduledMessagesView messages={messages} />
    </div>
  );
}
