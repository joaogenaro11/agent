"use client";

import { useState, useTransition } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  sendTestMessageAction,
  simulateInboundAction,
} from "@/server/actions/whatsapp";

export function WhatsAppTester({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [message, setMessage] = useState("");
  const [inbound, setInbound] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setStatus(null);
    startTransition(async () => {
      const res = await sendTestMessageAction({ to, message });
      setStatus({ ok: res.ok, text: res.ok ? res.message! : res.error! });
      if (res.ok) setMessage("");
    });
  }

  function simulate() {
    setReply(null);
    startTransition(async () => {
      const res = await simulateInboundAction(inbound);
      if (res.ok) {
        setReply(res.message ?? "");
        setInbound("");
      } else {
        setReply(`Erro: ${res.error}`);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Enviar mensagem de teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Número de destino</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="whatsapp:+55..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a mensagem de teste..."
            />
          </div>
          <Button onClick={send} disabled={pending} className="w-full">
            {pending ? "Enviando..." : "Enviar mensagem"}
          </Button>
          {status && (
            <p
              className={`text-sm ${status.ok ? "text-emerald-600" : "text-destructive"}`}
            >
              {status.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Simular mensagem recebida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Executa o pipeline completo (interpretação por IA, ação e resposta)
            sem depender do Twilio. Ex.: &quot;Bebi 750ml&quot;, &quot;O que tenho
            hoje?&quot;, &quot;Me lembra amanhã às 9h de comprar leite&quot;.
          </p>
          <Textarea
            value={inbound}
            onChange={(e) => setInbound(e.target.value)}
            placeholder="Mensagem como se viesse do seu WhatsApp..."
          />
          <Button
            onClick={simulate}
            disabled={pending}
            variant="secondary"
            className="w-full"
          >
            {pending ? "Processando..." : "Simular recebimento"}
          </Button>
          {reply && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Resposta do assistente:
              </p>
              <p className="whitespace-pre-wrap">{reply}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
