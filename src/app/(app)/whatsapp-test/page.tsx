import { DateTime } from "luxon";
import { PageHeader } from "@/components/page-header";
import { WhatsAppTester } from "@/components/whatsapp/whatsapp-tester";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function WhatsAppTestPage() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const messages = await prisma.whatsAppMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div>
      <PageHeader
        title="Teste de WhatsApp"
        description={`Provedor ativo: ${env.WHATSAPP_PROVIDER}. Envie mensagens de teste e simule mensagens recebidas.`}
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Como testar o Twilio WhatsApp Sandbox</p>
        <ol className="ml-4 mt-1 list-decimal space-y-0.5">
          <li>
            No console do Twilio, ative o WhatsApp Sandbox e envie o código de
            adesão (ex.: <code>join &lt;palavra&gt;</code>) do seu número.
          </li>
          <li>
            Preencha <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>{" "}
            e <code>TWILIO_WHATSAPP_FROM</code> no <code>.env.local</code>.
          </li>
          <li>
            Defina <code>WHATSAPP_PROVIDER=twilio</code> e aponte o webhook do
            Sandbox para <code>{env.APP_URL}/api/webhooks/whatsapp</code>.
          </li>
          <li>
            Com <code>WHATSAPP_PROVIDER=mock</code>, nada é enviado de verdade —
            ideal para desenvolvimento.
          </li>
        </ol>
      </div>

      <WhatsAppTester defaultTo={user.phone} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <Badge variant={m.direction === "INBOUND" ? "secondary" : "default"}>
                  {m.direction === "INBOUND" ? "Recebida" : "Enviada"}
                </Badge>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {DateTime.fromJSDate(m.createdAt).setZone(tz).toFormat("dd/MM HH:mm")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
