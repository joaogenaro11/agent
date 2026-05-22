import { PageHeader } from "@/components/page-header";
import { DevotionalsView } from "@/components/devotionals/devotionals-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function DevotionalsPage() {
  const user = await getCurrentUser();
  const items = await prisma.devotionalTemplate.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Devocionais"
        description="Modelos de devocional. A geração respeita a configuração de conteúdo espiritual."
      />
      <DevotionalsView items={items} />
    </div>
  );
}
