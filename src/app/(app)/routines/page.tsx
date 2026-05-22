import { PageHeader } from "@/components/page-header";
import { RoutinesView } from "@/components/routines/routines-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function RoutinesPage() {
  const user = await getCurrentUser();
  const routines = await prisma.routine.findMany({
    where: { userId: user.id },
    orderBy: { time: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Rotinas"
        description="Conjuntos de ações recorrentes — mensagens, devocionais, cobranças de hábito ou checklists."
      />
      <RoutinesView routines={routines} />
    </div>
  );
}
