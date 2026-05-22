"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Droplet,
  BookOpen,
  Dumbbell,
  Send,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { quickLogByNameAction } from "@/server/actions/habits";
import { generateSampleAction } from "@/server/actions/content";

export function QuickActions() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sample, setSample] = useState<string | null>(null);

  function quickLog(name: string, input: { value?: number; completed?: boolean }) {
    setFeedback(null);
    startTransition(async () => {
      const res = await quickLogByNameAction(name, input);
      setFeedback(res.ok ? `${name}: ${res.message ?? "registrado"}` : res.error ?? "Erro");
    });
  }

  function generate(kind: "devotional" | "motivational") {
    setSample(null);
    startTransition(async () => {
      const res = await generateSampleAction(kind);
      setSample(res.message ?? res.error ?? "");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/reminders">
            <Bell /> Criar lembrete
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => quickLog("Água", { value: 250 })}
        >
          <Droplet /> +250ml de água
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => quickLog("Leitura bíblica", { completed: true })}
        >
          <BookOpen /> Marcar leitura
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => quickLog("Treino 1", { completed: true })}
        >
          <Dumbbell /> Marcar treino
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/whatsapp-test">
            <Send /> Testar WhatsApp
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => generate("devotional")}
        >
          <Sparkles /> Devocional teste
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => generate("motivational")}
        >
          <MessageSquare /> Motivacional teste
        </Button>
      </div>

      {feedback && <p className="text-sm text-emerald-600">{feedback}</p>}
      {sample && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <p className="whitespace-pre-wrap">{sample}</p>
        </div>
      )}
    </div>
  );
}
