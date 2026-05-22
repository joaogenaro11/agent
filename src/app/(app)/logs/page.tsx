import { DateTime } from "luxon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "success" | "destructive" | "secondary"> =
  {
    SENT: "success",
    FAILED: "destructive",
    SKIPPED: "secondary",
    PENDING: "default",
  };

export default async function LogsPage() {
  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const fmt = (d: Date) => DateTime.fromJSDate(d).setZone(tz).toFormat("dd/MM HH:mm:ss");

  const [deliveries, aiLogs, messages] = await Promise.all([
    prisma.messageDeliveryLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.aIInteractionLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.whatsAppMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Logs"
        description="Registros de entregas, interações de IA e mensagens de WhatsApp."
      />

      <Tabs defaultValue="deliveries">
        <TabsList>
          <TabsTrigger value="deliveries">Entregas ({deliveries.length})</TabsTrigger>
          <TabsTrigger value="ai">IA ({aiLogs.length})</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp ({messages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nenhuma entrega registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmt(d.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">{d.type}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-xs">
                        {d.errorMessage ?? d.messageBody ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Intenção</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nenhuma interação registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {aiLogs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmt(a.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{a.intent ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{a.input}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{a.output}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                        Nenhuma mensagem registrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {messages.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmt(m.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.direction === "INBOUND" ? "secondary" : "default"}>
                          {m.direction === "INBOUND" ? "Recebida" : "Enviada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-lg truncate text-xs">{m.body}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
