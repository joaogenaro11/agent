"use client";

import { useState, useTransition } from "react";
import type { DevotionalTemplate } from "@prisma/client";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
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
  deleteDevotionalAction,
  generateSampleAction,
  saveDevotionalAction,
} from "@/server/actions/content";

type FormState = {
  title: string;
  theme: string;
  verse: string;
  style: string;
  size: string;
  basePrompt: string;
  optionalLink: string;
  active: boolean;
};

function emptyForm(): FormState {
  return {
    title: "",
    theme: "",
    verse: "",
    style: "",
    size: "media",
    basePrompt: "",
    optionalLink: "",
    active: true,
  };
}

export function DevotionalsView({ items }: { items: DevotionalTemplate[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DevotionalTemplate | null>(null);
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

  function openEdit(d: DevotionalTemplate) {
    setEditing(d);
    setForm({
      title: d.title,
      theme: d.theme,
      verse: d.verse,
      style: d.style,
      size: d.size,
      basePrompt: d.basePrompt,
      optionalLink: d.optionalLink ?? "",
      active: d.active,
    });
    setError(null);
    setOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveDevotionalAction(editing?.id ?? null, form);
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  function test(theme: string) {
    setSample(null);
    startTransition(async () => {
      const res = await generateSampleAction("devotional", theme);
      setSample(res.message ?? res.error ?? "");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus /> Novo devocional
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
          <p className="text-sm text-muted-foreground">Nenhum devocional cadastrado.</p>
        )}
        {items.map((d) => (
          <Card key={d.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">Tema: {d.theme}</p>
                </div>
                <Badge variant={d.active ? "default" : "secondary"}>
                  {d.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              {d.verse && (
                <p className="text-sm italic text-muted-foreground">{d.verse}</p>
              )}
              <div className="flex justify-end gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  title="Gerar amostra"
                  disabled={pending}
                  onClick={() => test(d.theme)}
                >
                  <Sparkles />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(
                      async () => void (await deleteDevotionalAction(d.id)),
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
            <DialogTitle>{editing ? "Editar devocional" : "Novo devocional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tema</Label>
                <Input
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Versículo base</Label>
                <Input
                  value={form.verse}
                  onChange={(e) => setForm({ ...form, verse: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estilo</Label>
                <Input
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tamanho</Label>
                <Input
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="curta, media, detalhada"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Prompt personalizado</Label>
              <Textarea
                value={form.basePrompt}
                onChange={(e) => setForm({ ...form, basePrompt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link externo opcional</Label>
              <Input
                value={form.optionalLink}
                onChange={(e) => setForm({ ...form, optionalLink: e.target.value })}
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
