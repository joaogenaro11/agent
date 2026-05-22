"use client";

import { useState, useTransition } from "react";
import type { MotivationalTemplate } from "@prisma/client";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
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
  deleteMotivationalAction,
  generateSampleAction,
  saveMotivationalAction,
} from "@/server/actions/content";

type FormState = {
  title: string;
  objective: string;
  intensity: string;
  style: string;
  allowedThemes: string;
  forbiddenThemes: string;
  basePrompt: string;
  active: boolean;
};

function toForm(m: MotivationalTemplate): FormState {
  return {
    title: m.title,
    objective: m.objective,
    intensity: m.intensity,
    style: m.style,
    allowedThemes: m.allowedThemes.join(", "),
    forbiddenThemes: m.forbiddenThemes.join(", "),
    basePrompt: m.basePrompt,
    active: m.active,
  };
}

function emptyForm(): FormState {
  return {
    title: "",
    objective: "",
    intensity: "media",
    style: "",
    allowedThemes: "",
    forbiddenThemes: "",
    basePrompt: "",
    active: true,
  };
}

const splitThemes = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function MotivationalView({ items }: { items: MotivationalTemplate[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MotivationalTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(m: MotivationalTemplate) {
    setEditing(m);
    setForm(toForm(m));
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveMotivationalAction(editing?.id ?? null, {
        title: form.title,
        objective: form.objective,
        intensity: form.intensity,
        style: form.style,
        allowedThemes: splitThemes(form.allowedThemes),
        forbiddenThemes: splitThemes(form.forbiddenThemes),
        basePrompt: form.basePrompt,
        active: form.active,
      });
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  function test() {
    setSample(null);
    startTransition(async () => {
      const res = await generateSampleAction("motivational");
      setSample(res.message ?? res.error ?? "");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={test} disabled={pending}>
          <MessageSquare /> Gerar amostra
        </Button>
        <Button onClick={openCreate}>
          <Plus /> Novo modelo
        </Button>
      </div>

      {sample && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Amostra gerada:
            </p>
            <p className="whitespace-pre-wrap text-sm">{sample}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
        )}
        {items.map((m) => (
          <Card key={m.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Intensidade: {m.intensity}
                  </p>
                </div>
                <Badge variant={m.active ? "default" : "secondary"}>
                  {m.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {m.objective && (
                <p className="text-sm text-muted-foreground">{m.objective}</p>
              )}
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(
                      async () => void (await deleteMotivationalAction(m.id)),
                    )
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
            <DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo da mensagem</Label>
              <Input
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intensidade</Label>
                <Input
                  value={form.intensity}
                  onChange={(e) => setForm({ ...form, intensity: e.target.value })}
                  placeholder="baixa, media, alta"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estilo</Label>
                <Input
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temas permitidos (vírgula)</Label>
              <Input
                value={form.allowedThemes}
                onChange={(e) => setForm({ ...form, allowedThemes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temas proibidos (vírgula)</Label>
              <Input
                value={form.forbiddenThemes}
                onChange={(e) => setForm({ ...form, forbiddenThemes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prompt base</Label>
              <Textarea
                value={form.basePrompt}
                onChange={(e) => setForm({ ...form, basePrompt: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Ativo</Label>
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
