import { PageHeader } from "@/components/page-header";
import { MotivationalView } from "@/components/motivational/motivational-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function MotivationalPage() {
  const user = await getCurrentUser();
  const items = await prisma.motivationalTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Motivacionais"
        description="Modelos de mensagens motivacionais. A IA varia o texto a cada envio para não soar repetitivo."
      />
      <MotivationalView items={items} />
    </div>
  );
}
