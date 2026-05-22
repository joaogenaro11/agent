"use client";

import { useState, useTransition } from "react";
import type { Routine, RoutineType } from "@prisma/client";
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
import { deleteRoutineAction, saveRoutineAction } from "@/server/actions/content";

const TYPE_LABEL: Record<RoutineType, string> = {
  MOTIVACIONAL: "Motivacional",
  DEVOCIONAL: "Devocional",
  HABITO: "Hábito",
  LEMBRETE: "Lembrete",
  CHECKLIST: "Checklist",
};

type FormState = {
  name: string;
  description: string;
  weekdays: number[];
  time: string;
  type: RoutineType;
  baseContent: string;
  active: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    weekdays: [],
    time: "08:00",
    type: "MOTIVACIONAL",
    baseContent: "",
    active: true,
  };
}

export function RoutinesView({ routines }: { routines: Routine[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Routine) {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? "",
      weekdays: r.weekdays,
      time: r.time,
      type: r.type,
      baseContent: r.baseContent,
      active: r.active,
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveRoutineAction(editing?.id ?? null, form);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus /> Nova rotina
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routines.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma rotina cadastrada.</p>
        )}
        {routines.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[r.type]} · {r.time}
                  </p>
                </div>
                <Badge variant={r.active ? "default" : "secondary"}>
                  {r.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              {r.description && (
                <p className="text-sm text-muted-foreground">{r.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {r.weekdays.length === 0
                  ? "Todos os dias"
                  : `Dias: ${r.weekdays.join(", ")}`}
              </p>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => void (await deleteRoutineAction(r.id)))
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar rotina" : "Nova rotina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as RoutineType })}
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
              <Label>Dias da semana (vazio = todos)</Label>
              <WeekdayPicker
                value={form.weekdays}
                onChange={(d) => setForm({ ...form, weekdays: d })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo base</Label>
              <Textarea
                value={form.baseContent}
                onChange={(e) => setForm({ ...form, baseContent: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Ativa</Label>
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
