"use client";

import { useState, useTransition } from "react";
import type { AssistantSettings } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettingsAction } from "@/server/actions/settings";

const TONES = ["LEVE", "DIRETO", "INTENSO", "ESPIRITUAL", "EXECUTIVO", "AMIGAVEL"];
const LEVELS = ["BAIXO", "MEDIO", "ALTO"];
const LENGTHS = ["CURTA", "MEDIA", "DETALHADA"];
const MODES = ["NORMAL", "COBRANCA_ALTA", "LEVE", "FOCO", "DESCANSO"];

export function SettingsForm({ settings }: { settings: AssistantSettings }) {
  const [form, setForm] = useState({
    assistantName: settings.assistantName,
    userDisplayName: settings.userDisplayName,
    tone: settings.tone,
    accountabilityLevel: settings.accountabilityLevel,
    messageLength: settings.messageLength,
    currentMode: settings.currentMode,
    allowSpiritualContent: settings.allowSpiritualContent,
    allowEmojis: settings.allowEmojis,
    motivationalStyle: settings.motivationalStyle,
    devotionalStyle: settings.devotionalStyle,
    forbiddenTopics: settings.forbiddenTopics.join(", "),
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    timezone: settings.timezone,
  });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setStatus(null);
    startTransition(async () => {
      const res = await updateSettingsAction({
        ...form,
        tone: form.tone,
        accountabilityLevel: form.accountabilityLevel,
        messageLength: form.messageLength,
        currentMode: form.currentMode,
        forbiddenTopics: form.forbiddenTopics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setStatus(
        res.ok
          ? { ok: true, text: "Configurações salvas." }
          : { ok: false, text: res.error ?? "Erro ao salvar" },
      );
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome do assistente</Label>
            <Input
              value={form.assistantName}
              onChange={(e) => setForm({ ...form, assistantName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Como o assistente te chama</Label>
            <Input
              value={form.userDisplayName}
              onChange={(e) => setForm({ ...form, userDisplayName: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personalidade</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tom</Label>
            <Select
              value={form.tone}
              onValueChange={(v) => setForm({ ...form, tone: v as typeof form.tone })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nível de cobrança</Label>
            <Select
              value={form.accountabilityLevel}
              onValueChange={(v) =>
                setForm({ ...form, accountabilityLevel: v as typeof form.accountabilityLevel })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tamanho da mensagem</Label>
            <Select
              value={form.messageLength}
              onValueChange={(v) =>
                setForm({ ...form, messageLength: v as typeof form.messageLength })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENGTHS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modo atual</Label>
            <Select
              value={form.currentMode}
              onValueChange={(v) =>
                setForm({ ...form, currentMode: v as typeof form.currentMode })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.allowSpiritualContent}
              onCheckedChange={(v) => setForm({ ...form, allowSpiritualContent: v })}
            />
            <Label>Permitir conteúdo espiritual</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.allowEmojis}
              onCheckedChange={(v) => setForm({ ...form, allowEmojis: v })}
            />
            <Label>Permitir emojis</Label>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Estilo motivacional</Label>
            <Textarea
              value={form.motivationalStyle}
              onChange={(e) => setForm({ ...form, motivationalStyle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Estilo devocional</Label>
            <Textarea
              value={form.devotionalStyle}
              onChange={(e) => setForm({ ...form, devotionalStyle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Tópicos proibidos (separados por vírgula)</Label>
            <Input
              value={form.forbiddenTopics}
              onChange={(e) => setForm({ ...form, forbiddenTopics: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Início do silêncio</Label>
            <Input
              type="time"
              value={form.quietHoursStart}
              onChange={(e) => setForm({ ...form, quietHoursStart: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fim do silêncio</Label>
            <Input
              type="time"
              value={form.quietHoursEnd}
              onChange={(e) => setForm({ ...form, quietHoursEnd: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fuso horário</Label>
            <Input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Durante o silêncio, mensagens agendadas são adiadas para depois do fim
            da janela — não são descartadas.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
        {status && (
          <span
            className={`text-sm ${status.ok ? "text-emerald-600" : "text-destructive"}`}
          >
            {status.text}
          </span>
        )}
      </div>
    </div>
  );
}
