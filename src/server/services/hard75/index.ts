import { prisma } from "@/lib/db";
import { dayRange, nowInZone, toZoned } from "@/lib/datetime";
import { normalize } from "@/server/services/habits";
import type { Hard75Challenge, Hard75DailyLog } from "@prisma/client";

export async function getActiveChallenge(
  userId: string,
): Promise<Hard75Challenge | null> {
  return prisma.hard75Challenge.findFirst({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Dia atual do desafio (1-based) conforme a data de início. */
export function currentDay(challenge: Hard75Challenge, tz: string): number {
  const start = toZoned(challenge.startDate, tz).startOf("day");
  const today = nowInZone(tz).startOf("day");
  return Math.max(1, Math.floor(today.diff(start, "days").days) + 1);
}

/** Obtém (ou cria) o log do dia atual para o desafio ativo. */
export async function getOrCreateTodayLog(
  userId: string,
  tz: string,
): Promise<{ challenge: Hard75Challenge; log: Hard75DailyLog } | null> {
  const challenge = await getActiveChallenge(userId);
  if (!challenge) return null;
  const date = dayRange(nowInZone(tz)).start;

  const log = await prisma.hard75DailyLog.upsert({
    where: { challengeId_date: { challengeId: challenge.id, date } },
    create: { challengeId: challenge.id, userId, date },
    update: {},
  });
  return { challenge, log };
}

/** Verifica se todos os requisitos obrigatórios do dia foram cumpridos. */
export function isDayComplete(log: Hard75DailyLog, challenge: Hard75Challenge): boolean {
  return (
    log.waterMl >= challenge.targetWaterMl &&
    log.workout1 &&
    log.workout2 &&
    log.readingDone &&
    log.pagesRead >= challenge.targetPages &&
    log.dietDone &&
    log.progressPhoto
  );
}

export type Hard75Field =
  | "water"
  | "workout1"
  | "workout2"
  | "reading"
  | "diet"
  | "photo"
  | "devotional";

/** Mapeia o nome de um hábito para o campo correspondente do 75 Hard. */
export function mapHabitToHard75Field(habitName: string): Hard75Field | null {
  const n = normalize(habitName);
  if (n.includes("agua") || n.includes("water")) return "water";
  if (n.includes("treino 1") || n.includes("treino1") || n.includes("workout 1")) return "workout1";
  if (n.includes("treino 2") || n.includes("treino2") || n.includes("workout 2")) return "workout2";
  if (n.includes("leitura") || n.includes("livro") || n.includes("pagina") || n.includes("biblia"))
    return "reading";
  if (n.includes("dieta")) return "diet";
  if (n.includes("foto")) return "photo";
  if (n.includes("devocional")) return "devotional";
  return null;
}

/** Aplica um registro de hábito ao log do 75 Hard, se houver desafio ativo. */
export async function syncFromHabit(
  userId: string,
  tz: string,
  habitName: string,
  input: { value?: number | null; completed?: boolean | null },
): Promise<{ challenge: Hard75Challenge; log: Hard75DailyLog } | null> {
  const field = mapHabitToHard75Field(habitName);
  if (!field) return null;
  const current = await getOrCreateTodayLog(userId, tz);
  if (!current) return null;

  const { challenge, log } = current;
  const data: Partial<Hard75DailyLog> = {};
  switch (field) {
    case "water":
      data.waterMl = log.waterMl + (input.value ?? 0);
      break;
    case "workout1":
      data.workout1 = input.completed ?? true;
      break;
    case "workout2":
      data.workout2 = input.completed ?? true;
      break;
    case "reading":
      data.readingDone = input.completed ?? true;
      if (input.value) data.pagesRead = log.pagesRead + input.value;
      break;
    case "diet":
      data.dietDone = input.completed ?? true;
      break;
    case "photo":
      data.progressPhoto = input.completed ?? true;
      break;
    case "devotional":
      data.devotionalDone = input.completed ?? true;
      break;
  }

  const merged = { ...log, ...data } as Hard75DailyLog;
  const updated = await prisma.hard75DailyLog.update({
    where: { id: log.id },
    data: { ...data, completed: isDayComplete(merged, challenge) },
  });
  return { challenge, log: updated };
}

/** Texto de status do 75 Hard no dia atual. */
export async function formatHard75Status(userId: string, tz: string): Promise<string> {
  const current = await getOrCreateTodayLog(userId, tz);
  if (!current) {
    return "Você não tem um desafio 75 Hard ativo. Crie um na página /75-hard.";
  }
  const { challenge, log } = current;
  const day = currentDay(challenge, tz);
  const mark = (ok: boolean) => (ok ? "✅" : "❌");
  const waterOk = log.waterMl >= challenge.targetWaterMl;

  return [
    `Status do 75 Hard — dia ${day}/${challenge.durationDays}:`,
    ``,
    `${mark(waterOk)} Água: ${log.waterMl}ml/${challenge.targetWaterMl}ml`,
    `${mark(log.workout1)} Treino 1`,
    `${mark(log.workout2)} Treino 2`,
    `${mark(log.readingDone && log.pagesRead >= challenge.targetPages)} Leitura (${log.pagesRead}/${challenge.targetPages} págs)`,
    `${mark(log.dietDone)} Dieta`,
    `${mark(log.progressPhoto)} Foto de progresso`,
    ``,
    isDayComplete(log, challenge)
      ? "Dia fechado. Excelente constância."
      : "Ainda dá tempo de fechar o dia bem.",
  ].join("\n");
}
