"use client";

import { useState, useTransition } from "react";
import type { Habit, HabitLog, HabitType } from "@prisma/client";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
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
  createHabitAction,
  deleteHabitAction,
  logHabitAction,
  updateHabitAction,
} from "@/server/actions/habits";

type HabitWithLog = { habit: Habit; log: HabitLog | null };

type FormState = {
  name: string;
  description: string;
  type: HabitType;
  targetValue: string;
  unit: string;
  activeDays: number[];
  reminderTime: string;
  active: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    type: "BOOLEAN",
    targetValue: "",
    unit: "",
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    reminderTime: "",
    active: true,
  };
}

export function HabitsView({ items }: { items: HabitWithLog[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(h: Habit) {
    setEditing(h);
    setForm({
      name: h.name,
      description: h.description ?? "",
      type: h.type,
      targetValue: h.targetValue?.toString() ?? "",
      unit: h.unit ?? "",
      activeDays: h.activeDays,
      reminderTime: h.reminderTime ?? "",
      active: h.active,
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      type: form.type,
      targetValue: form.targetValue ? Number(form.targetValue) : null,
      unit: form.unit,
      activeDays: form.activeDays,
      reminderTime: form.reminderTime,
      active: form.active,
    };
    startTransition(async () => {
      const res = editing
        ? await updateHabitAction(editing.id, payload)
        : await createHabitAction(payload);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  function log(habit: Habit) {
    startTransition(async () => {
      if (habit.type === "NUMERIC") {
        const step = habit.targetValue ? Math.round(habit.targetValue / 4) : 1;
        await logHabitAction(habit.id, { value: step });
      } else {
        await logHabitAction(habit.id, { completed: true });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus /> Novo hábito
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum hábito cadastrado.</p>
        )}
        {items.map(({ habit, log: hlog }) => (
          <Card key={habit.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{habit.name}</p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground">{habit.description}</p>
                  )}
                </div>
                <Badge variant={habit.active ? "default" : "secondary"}>
                  {habit.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {habit.type === "NUMERIC" && habit.targetValue
                    ? `${hlog?.value ?? 0}/${habit.targetValue} ${habit.unit ?? ""}`
                    : hlog?.completed
                      ? "Concluído hoje"
                      : "Pendente hoje"}
                </span>
                {habit.reminderTime && (
                  <span className="text-xs text-muted-foreground">
                    Cobrança {habit.reminderTime}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => log(habit)}
                  className="flex-1"
                >
                  <Check /> Registrar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(habit)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteHabitAction(habit.id);
                    })
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
            <DialogTitle>{editing ? "Editar hábito" : "Novo hábito"}</DialogTitle>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as HabitType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOLEAN">Sim/Não</SelectItem>
                    <SelectItem value="NUMERIC">Numérico</SelectItem>
                    <SelectItem value="CHECKLIST">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Meta diária</Label>
                <Input
                  type="number"
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder="ml, páginas..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Dias ativos</Label>
              <WeekdayPicker
                value={form.activeDays}
                onChange={(d) => setForm({ ...form, activeDays: d })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário de cobrança</Label>
                <Input
                  type="time"
                  value={form.reminderTime}
                  onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
                <Label>Ativo</Label>
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
