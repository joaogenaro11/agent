"use client";

import { cn } from "@/lib/utils";

const LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/**
 * Seletor de dias da semana. Convenção: 0 = domingo .. 6 = sábado.
 * Lista vazia significa "todos os dias".
 */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort(),
    );
  }

  return (
    <div className="flex gap-1">
      {LABELS.map((label, day) => (
        <button
          key={day}
          type="button"
          title={NAMES[day]}
          onClick={() => toggle(day)}
          className={cn(
            "h-8 w-8 rounded-md border text-xs font-medium transition-colors",
            value.includes(day)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-card text-muted-foreground hover:bg-accent",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
