"use client";

import { useState, useTransition } from "react";
import type { Hard75Challenge, Hard75DailyLog } from "@prisma/client";
import { Droplet, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  startHard75ChallengeAction,
  updateHard75ChallengeAction,
  updateHard75DailyAction,
} from "@/server/actions/hard75";

type Props = {
  challenge: Hard75Challenge | null;
  log: Hard75DailyLog | null;
  day: number;
};

const CHECKS: { key: keyof Hard75DailyLog; label: string }[] = [
  { key: "workout1", label: "Treino 1" },
  { key: "workout2", label: "Treino 2" },
  { key: "readingDone", label: "Leitura concluída" },
  { key: "dietDone", label: "Dieta cumprida" },
  { key: "progressPhoto", label: "Foto de progresso" },
  { key: "devotionalDone", label: "Devocional (opcional)" },
];

export function Hard75View({ challenge, log, day }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [waterInput, setWaterInput] = useState("");
  const [pagesInput, setPagesInput] = useState(log?.pagesRead?.toString() ?? "");
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [cfg, setCfg] = useState({
    targetWaterMl: challenge?.targetWaterMl ?? 3000,
    targetPages: challenge?.targetPages ?? 10,
    durationDays: challenge?.durationDays ?? 75,
    rules: challenge?.rules ?? "",
    checkInTimes: (challenge?.checkInTimes ?? []).join(", "),
    active: challenge?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  if (!challenge) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Você não tem um desafio 75 Hard ativo.
          </p>
          <Button
            disabled={pending}
            onClick={() => startTransition(async () => void (await startHard75ChallengeAction()))}
          >
            Iniciar desafio 75 Hard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const water = log?.waterMl ?? 0;
  const update = (data: Parameters<typeof updateHard75DailyAction>[0]) =>
    startTransition(async () => void (await updateHard75DailyAction(data)));

  function saveConfig() {
    setError(null);
    startTransition(async () => {
      const res = await updateHard75ChallengeAction(challenge!.id, {
        targetWaterMl: Number(cfg.targetWaterMl),
        targetPages: Number(cfg.targetPages),
        durationDays: Number(cfg.durationDays),
        rules: cfg.rules,
        checkInTimes: cfg.checkInTimes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        active: cfg.active,
      });
      if (res.ok) setOpen(false);
      else setError(res.error ?? "Erro ao salvar");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Dia {day} de {challenge.durationDays}
            {log?.completed && (
              <Badge variant="success" className="ml-2">
                Dia fechado
              </Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Settings2 /> Editar desafio
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Droplet className="h-4 w-4 text-primary" /> Água
              </span>
              <span className="text-muted-foreground">
                {water}/{challenge.targetWaterMl}ml
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (water / challenge.targetWaterMl) * 100)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[250, 500, 750].map((ml) => (
                <Button
                  key={ml}
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => update({ waterMl: water + ml })}
                >
                  +{ml}ml
                </Button>
              ))}
              <div className="flex gap-1">
                <Input
                  className="h-8 w-24"
                  type="number"
                  placeholder="ml"
                  value={waterInput}
                  onChange={(e) => setWaterInput(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending || !waterInput}
                  onClick={() => {
                    update({ waterMl: Number(waterInput) });
                    setWaterInput("");
                  }}
                >
                  Definir
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {CHECKS.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
              >
                {label}
                <Switch
                  checked={Boolean(log?.[key])}
                  disabled={pending}
                  onCheckedChange={(v) => update({ [key]: v })}
                />
              </label>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>Páginas lidas</Label>
              <Input
                type="number"
                className="w-32"
                value={pagesInput}
                onChange={(e) => setPagesInput(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => update({ pagesRead: Number(pagesInput || 0) })}
            >
              Salvar páginas
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Observações do dia</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => update({ notes })}
            >
              Salvar observações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar desafio 75 Hard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Meta de água (ml)</Label>
                <Input
                  type="number"
                  value={cfg.targetWaterMl}
                  onChange={(e) =>
                    setCfg({ ...cfg, targetWaterMl: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Meta de páginas</Label>
                <Input
                  type="number"
                  value={cfg.targetPages}
                  onChange={(e) =>
                    setCfg({ ...cfg, targetPages: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duração (dias)</Label>
                <Input
                  type="number"
                  value={cfg.durationDays}
                  onChange={(e) =>
                    setCfg({ ...cfg, durationDays: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Regras / hábitos obrigatórios</Label>
              <Textarea
                value={cfg.rules}
                onChange={(e) => setCfg({ ...cfg, rules: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horários de check-in (separados por vírgula)</Label>
              <Input
                value={cfg.checkInTimes}
                onChange={(e) => setCfg({ ...cfg, checkInTimes: e.target.value })}
                placeholder="07:00, 13:00, 21:00"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cfg.active}
                onCheckedChange={(v) => setCfg({ ...cfg, active: v })}
              />
              <Label>Desafio ativo</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveConfig} disabled={pending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
