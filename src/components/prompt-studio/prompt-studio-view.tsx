"use client";

import { useState, useTransition } from "react";
import type { PromptTemplate } from "@prisma/client";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { updatePromptAction } from "@/server/actions/content";

export function PromptStudioView({ prompts }: { prompts: PromptTemplate[] }) {
  const [editing, setEditing] = useState<PromptTemplate | null>(null);
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openEdit(p: PromptTemplate) {
    setEditing(p);
    setContent(p.content);
    setActive(p.active);
    setError(null);
  }

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const res = await updatePromptAction(editing.id, content, active);
      if (res.ok) setEditing(null);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Alterar estes prompts pode mudar o comportamento do assistente.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {prompts.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.type} · versão {p.version}
                  </p>
                </div>
                <Badge variant={p.active ? "default" : "secondary"}>
                  {p.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{p.content}</p>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil /> Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-amber-700">
              Salvar uma alteração de conteúdo incrementa a versão do prompt.
            </p>
            <div className="space-y-1.5">
              <Label>Conteúdo do prompt</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[220px] font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Ativo</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
