import { DateTime } from "luxon";

export const DEFAULT_TZ = "America/Sao_Paulo";

/** Agora no fuso informado. */
export function nowInZone(tz: string = DEFAULT_TZ): DateTime {
  return DateTime.now().setZone(tz);
}

/** Converte um Date/ISO para DateTime no fuso informado. */
export function toZoned(date: Date | string, tz: string = DEFAULT_TZ): DateTime {
  const dt = typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
  return dt.setZone(tz);
}

/** Converte "HH:mm" em { hour, minute }. Retorna null se inválido. */
export function parseTime(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Aplica o horário "HH:mm" a uma data, no fuso informado. */
export function atTimeOnDate(date: DateTime, time: string): DateTime {
  const t = parseTime(time);
  if (!t) return date;
  return date.set({ hour: t.hour, minute: t.minute, second: 0, millisecond: 0 });
}

/** Dia da semana no padrão de armazenamento: 0=domingo .. 6=sábado. */
export function jsWeekday(dt: DateTime): number {
  return dt.weekday % 7;
}

function minutesOfDay(time: string): number {
  const t = parseTime(time);
  return t ? t.hour * 60 + t.minute : 0;
}

/**
 * Verifica se o instante cai dentro do quiet hours.
 * Suporta janelas que cruzam a meia-noite (ex.: 22:00 -> 07:00).
 */
export function isWithinQuietHours(
  dt: DateTime,
  start: string,
  end: string,
): boolean {
  const cur = dt.hour * 60 + dt.minute;
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

/**
 * Dado um instante dentro do quiet hours, retorna o DateTime em que a
 * janela termina (comportamento do MVP: adiar o envio para depois).
 */
export function quietHoursEnd(dt: DateTime, start: string, end: string): DateTime {
  const cur = dt.hour * 60 + dt.minute;
  const s = minutesOfDay(start);
  const e = minutesOfDay(end);
  const endToday = atTimeOnDate(dt, end);
  if (s < e) return endToday;
  // Janela noturna: se já passou da meia-noite, fim é hoje; senão, amanhã.
  return cur < e ? endToday : endToday.plus({ days: 1 });
}

/**
 * Calcula a próxima ocorrência de um lembrete recorrente após `from`.
 * Retorna null quando não há recorrência.
 */
export function nextRecurrence(
  from: DateTime,
  recurrenceType: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM" | "NONE",
  weekdays: number[] = [],
): DateTime | null {
  switch (recurrenceType) {
    case "DAILY":
      return from.plus({ days: 1 });
    case "WEEKLY":
      return from.plus({ weeks: 1 });
    case "MONTHLY":
      return from.plus({ months: 1 });
    case "CUSTOM": {
      // Regra simples: próxima data cujo dia da semana esteja na lista.
      if (weekdays.length === 0) return from.plus({ days: 1 });
      for (let i = 1; i <= 7; i++) {
        const candidate = from.plus({ days: i });
        if (weekdays.includes(jsWeekday(candidate))) return candidate;
      }
      return from.plus({ days: 1 });
    }
    default:
      return null;
  }
}

/** Formata data/hora em pt-BR amigável. */
export function formatPt(date: Date | string | DateTime, tz: string = DEFAULT_TZ): string {
  const dt =
    date instanceof DateTime ? date.setZone(tz) : toZoned(date as Date | string, tz);
  return dt.setLocale("pt-BR").toFormat("dd/MM/yyyy 'às' HH:mm");
}

/** Início e fim do dia no fuso informado, como Date (UTC). */
export function dayRange(dt: DateTime): { start: Date; end: Date } {
  return {
    start: dt.startOf("day").toUTC().toJSDate(),
    end: dt.endOf("day").toUTC().toJSDate(),
  };
}
