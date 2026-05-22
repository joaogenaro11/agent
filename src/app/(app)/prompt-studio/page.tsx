import { PageHeader } from "@/components/page-header";
import { PromptStudioView } from "@/components/prompt-studio/prompt-studio-view";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function PromptStudioPage() {
  const user = await getCurrentUser();
  const prompts = await prisma.promptTemplate.findMany({
    where: { userId: user.id },
    orderBy: { type: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Prompt Studio"
        description="Edite os prompts que guiam a interpretação de comandos e a geração de mensagens."
      />
      <PromptStudioView prompts={prompts} />
    </div>
  );
}
