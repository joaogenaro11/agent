"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { getOrCreateTodayLog, isDayComplete } from "@/server/services/hard75";

export type ActionState = { ok: boolean; error?: string };

const dailyPatch = z.object({
  waterMl: z.number().int().min(0).optional(),
  workout1: z.boolean().optional(),
  workout2: z.boolean().optional(),
  readingDone: z.boolean().optional(),
  pagesRead: z.number().int().min(0).optional(),
  dietDone: z.boolean().optional(),
  progressPhoto: z.boolean().optional(),
  devotionalDone: z.boolean().optional(),
  notes: z.string().optional(),
});

/** Atualiza campos do check-in diário do 75 Hard. */
export async function updateHard75DailyAction(
  input: z.input<typeof dailyPatch>,
): Promise<ActionState> {
  const parsed = dailyPatch.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const user = await getCurrentUser();
  const tz = user.settings?.timezone ?? user.timezone;
  const current = await getOrCreateTodayLog(user.id, tz);
  if (!current) return { ok: false, error: "Nenhum desafio 75 Hard ativo." };

  const merged = { ...current.log, ...parsed.data };
  await prisma.hard75DailyLog.update({
    where: { id: current.log.id },
    data: { ...parsed.data, completed: isDayComplete(merged, current.challenge) },
  });
  revalidatePath("/75-hard");
  revalidatePath("/dashboard");
  return { ok: true };
}

const challengePatch = z.object({
  targetWaterMl: z.number().int().min(0),
  targetPages: z.number().int().min(0),
  durationDays: z.number().int().min(1),
  rules: z.string().optional().default(""),
  checkInTimes: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

/** Edita as regras do desafio 75 Hard. */
export async function updateHard75ChallengeAction(
  id: string,
  input: z.input<typeof challengePatch>,
): Promise<ActionState> {
  const parsed = challengePatch.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await prisma.hard75Challenge.update({ where: { id }, data: parsed.data });
  revalidatePath("/75-hard");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Cria um novo desafio 75 Hard começando hoje. */
export async function startHard75ChallengeAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  await prisma.hard75Challenge.updateMany({
    where: { userId: user.id, active: true },
    data: { active: false },
  });
  await prisma.hard75Challenge.create({
    data: { userId: user.id, startDate: new Date(), active: true },
  });
  revalidatePath("/75-hard");
  return { ok: true };
}
