"use client";

import { useMemo, useState, useTransition } from "react";
import { DateTime } from "luxon";
import type { Channel, Priority, RecurrenceType, Reminder } from "@prisma/client";
import { Plus, Check, X, Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cancelReminderAction,
  completeReminderAction,
  createReminderAction,
  deleteReminderAction,
  postponeReminderAction,
  updateReminderAction,
} from "@/server/actions/reminders";

type Props = { reminders: Reminder[]; timezone: string };

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  COMPLETED: "Concluído",
  POSTPONED: "Adiado",
  CANCELLED: "Cancelado",
};
const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "secondary"> = {
  PENDING: "default",
  COMPLETED: "success",
  POSTPONED: "warning",
  CANCELLED: "secondary",
};

type FormState = {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueAt: string;
  hasSpecificTime: boolean;
  recurrenceType: RecurrenceType;
  channel: Channel;
};

function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    category: "",
    priority: "MEDIUM",
    dueAt: "",
    hasSpecificTime: true,
    recurrenceType: "NONE",
    channel: "WHATSAPP",
  };
}

export function RemindersView({ reminders, timezone }: Props) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return reminders.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && r.priority !== priorityFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [reminders, statusFilter, priorityFilter, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description ?? "",
      category: r.category ?? "",
      priority: r.priority,
      dueAt: DateTime.fromJSDate(r.dueAt).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm"),
      hasSpecificTime: r.hasSpecificTime,
      recurrenceType: r.recurrenceType,
      channel: r.channel,
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = editing
        ? await updateReminderAction(editing.id, form)
        : await createReminderAction(form);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  function runAction(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toda prioridade</SelectItem>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="ml-auto">
          <Plus /> Novo lembrete
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum lembrete encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium">{r.title}</p>
                  {r.category && (
                    <p className="text-xs text-muted-foreground">{r.category}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {DateTime.fromJSDate(r.dueAt)
                    .setZone(timezone)
                    .setLocale("pt-BR")
                    .toFormat(r.hasSpecificTime ? "dd/MM HH:mm" : "dd/MM")}
                </TableCell>
                <TableCell>
                  <Badge variant={r.priority === "HIGH" ? "destructive" : "secondary"}>
                    {PRIORITY_LABEL[r.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[r.status]}>
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {r.status !== "COMPLETED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Concluir"
                        disabled={pending}
                        onClick={() => runAction(() => completeReminderAction(r.id))}
                      >
                        <Check />
                      </Button>
                    )}
                    {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Adiar 1 dia"
                        disabled={pending}
                        onClick={() => runAction(() => postponeReminderAction(r.id, 24))}
                      >
                        <Clock />
                      </Button>
                    )}
                    {r.status !== "CANCELLED" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Cancelar"
                        disabled={pending}
                        onClick={() => runAction(() => cancelReminderAction(r.id))}
                      >
                        <X />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Editar"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Excluir"
                      disabled={pending}
                      onClick={() => runAction(() => deleteReminderAction(r.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lembrete" : "Novo lembrete"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Comprar leite"
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
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm({ ...form, priority: v as typeof form.priority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select
                  value={form.recurrenceType}
                  onValueChange={(v) =>
                    setForm({ ...form, recurrenceType: v as typeof form.recurrenceType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem recorrência</SelectItem>
                    <SelectItem value="DAILY">Diária</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="CUSTOM">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) =>
                    setForm({ ...form, channel: v as typeof form.channel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="WEB">Web</SelectItem>
                    <SelectItem value="BOTH">Ambos</SelectItem>
                  </SelectContent>
                </Select>
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
