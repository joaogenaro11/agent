import { Apple, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const connections = await prisma.integrationConnection.findMany({
    where: { userId: user.id },
  });
  const apple = connections.find((c) => c.provider === "apple_reminders");

  return (
    <div>
      <PageHeader
        title="Integrações"
        description="Conexões com serviços externos. Estrutura preparada para evoluções futuras."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-4 w-4" /> Apple Reminders
              <Badge variant="secondary" className="ml-auto">
                {apple?.status ?? "DISCONNECTED"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              A integração com o Apple Reminders exige um app/bridge macOS ou iOS
              usando <strong>EventKit</strong>, porque o acesso aos lembretes da
              Apple depende de permissão local do usuário no dispositivo.
            </p>
            <p>
              O backend não acessa o iCloud diretamente por APIs não oficiais. A
              interface <code>ReminderExternalProvider</code> e o{" "}
              <code>AppleRemindersProvider</code> (stub) já estão prontos para
              quando o bridge existir. O modelo <code>Reminder</code> tem{" "}
              <code>externalId</code> e <code>source</code> reservados para isso.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> WhatsApp
              <Badge className="ml-auto">{env.WHATSAPP_PROVIDER}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Provedor ativo definido por <code>WHATSAPP_PROVIDER</code>. O MVP usa
              o Twilio WhatsApp Sandbox; <code>mock</code> não envia mensagens reais.
            </p>
            <p>
              A camada <code>WhatsAppProvider</code> abstrai o envio e o
              recebimento. Migrar para a Meta WhatsApp Cloud API ou para o Twilio
              WhatsApp Business oficial é só implementar a interface — os stubs
              <code> MetaWhatsAppProvider</code> e{" "}
              <code>TwilioBusinessWhatsAppProvider</code> já existem.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
