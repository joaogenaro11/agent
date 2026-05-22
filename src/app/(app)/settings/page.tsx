import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user.settings) {
    return (
      <div>
        <PageHeader title="Configurações" />
        <p className="text-sm text-muted-foreground">
          Configurações não encontradas. Rode <code>npm run db:seed</code>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Configurações do assistente"
        description="Defina a personalidade, o tom e os horários do seu assessor pessoal."
      />
      <SettingsForm settings={user.settings} />
    </div>
  );
}
