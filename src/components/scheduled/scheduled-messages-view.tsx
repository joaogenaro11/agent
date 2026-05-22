"use client";

import { useState, useTransition } from "react";
import type { ScheduledMessage, ScheduledMessageType } from "@prisma/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeekdayPicker } from "@/components/weekday-picker";
import {
  deleteScheduledMessageAction,
  saveScheduledMessageAction,
} from "@/server/actions/content";

const TYPE_LABEL: Record<ScheduledMessageType, string> = {
  MOTIVACIONAL: "Motivacional",
  DEVOCIONAL: "Devocional",
  COBRANCA: "Cobrança",
  REVISAO_DIARIA: "Revisão diária",
  PLANEJAMENTO_DIARIO: "Planejamento do dia",
  LIVRE: "Livre",
};

type FormState = {
  type: ScheduledMessageType;
  title: string;
  basePrompt: string;
  time: string;
  weekdays: number[];
  active: boolean;
  useAI: boolean;
  optionalLink: string;
  category: string;
};

function emptyForm(): FormState {
  return {
    type: "LIVRE",
    title: "",
    basePrompt: "",
    time: "08:00",
    weekdays: [],
    active: true,
    useAI: true,
    optionalLink: "",
    category: "",
  };
}

export function ScheduledMessagesView({ messages }: { messages: ScheduledMessage[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledMessage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(m: ScheduledMessage) {
    setEditing(m);
    setForm({
      type: m.type,
      title: m.title,
      basePrompt: m.basePrompt,
      time: m.time,
      weekdays: m.weekdays,
      active: m.active,
      useAI: m.useAI,
      optionalLink: m.optionalLink ?? "",
      category: m.category ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveScheduledMessageAction(editing?.id ?? null, form);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus /> Nova mensagem
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma mensagem programada.</p>
        )}
        {messages.map((m) => (
          <Card key={m.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[m.type]} · {m.time}
                  </p>
                </div>
                <Badge variant={m.active ? "default" : "secondary"}>
                  {m.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              {m.basePrompt && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {m.basePrompt}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {m.useAI ? "Texto variado por IA" : "Texto fixo"}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(
                        async () => void (await deleteScheduledMessageAction(m.id)),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar mensagem" : "Nova mensagem programada"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as ScheduledMessageType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prompt base</Label>
              <Textarea
                value={form.basePrompt}
                onChange={(e) => setForm({ ...form, basePrompt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias da semana (vazio = todos)</Label>
              <WeekdayPicker
                value={form.weekdays}
                onChange={(d) => setForm({ ...form, weekdays: d })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Link opcional</Label>
                <Input
                  value={form.optionalLink}
                  onChange={(e) => setForm({ ...form, optionalLink: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.useAI}
                  onCheckedChange={(v) => setForm({ ...form, useAI: v })}
                />
                <Label>Variar com IA</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label>Ativa</Label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
