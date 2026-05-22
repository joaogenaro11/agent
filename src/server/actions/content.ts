"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import {
  composeDevotional,
  composeMotivational,
} from "@/server/services/ai/message-composer";

export type ActionState = { ok: boolean; error?: string; message?: string };

const fail = (e: z.ZodError): ActionState => ({
  ok: false,
  error: e.issues[0]?.message ?? "Dados inválidos",
});

// ----------------------------- Rotinas -----------------------------

const routineInput = z.object({
  name: z.string().min(1, "Informe um nome"),
  description: z.string().optional().default(""),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Horário inválido"),
  type: z.enum(["MOTIVACIONAL", "DEVOCIONAL", "HABITO", "LEMBRETE", "CHECKLIST"]),
  baseContent: z.string().optional().default(""),
  active: z.boolean().default(true),
});

export async function saveRoutineAction(
  id: string | null,
  input: z.input<typeof routineInput>,
): Promise<ActionState> {
  const parsed = routineInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const user = await getCurrentUser();
  const data = { ...parsed.data, description: parsed.data.description || null };
  if (id) await prisma.routine.update({ where: { id }, data });
  else await prisma.routine.create({ data: { ...data, userId: user.id } });
  revalidatePath("/routines");
  return { ok: true };
}

export async function deleteRoutineAction(id: string): Promise<ActionState> {
  await prisma.routine.delete({ where: { id } });
  revalidatePath("/routines");
  return { ok: true };
}

// ----------------------- Mensagens programadas -----------------------

const scheduledInput = z.object({
  type: z.enum([
    "MOTIVACIONAL",
    "DEVOCIONAL",
    "COBRANCA",
    "REVISAO_DIARIA",
    "PLANEJAMENTO_DIARIO",
    "LIVRE",
  ]),
  title: z.string().min(1, "Informe um título"),
  basePrompt: z.string().optional().default(""),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Horário inválido"),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  active: z.boolean().default(true),
  useAI: z.boolean().default(true),
  optionalLink: z.string().optional().default(""),
  category: z.string().optional().default(""),
});

export async function saveScheduledMessageAction(
  id: string | null,
  input: z.input<typeof scheduledInput>,
): Promise<ActionState> {
  const parsed = scheduledInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const user = await getCurrentUser();
  const data = {
    ...parsed.data,
    optionalLink: parsed.data.optionalLink || null,
    category: parsed.data.category || null,
  };
  if (id) await prisma.scheduledMessage.update({ where: { id }, data });
  else await prisma.scheduledMessage.create({ data: { ...data, userId: user.id } });
  revalidatePath("/scheduled-messages");
  return { ok: true };
}

export async function deleteScheduledMessageAction(id: string): Promise<ActionState> {
  await prisma.scheduledMessage.delete({ where: { id } });
  revalidatePath("/scheduled-messages");
  return { ok: true };
}

// --------------------------- Devocionais ---------------------------

const devotionalInput = z.object({
  title: z.string().min(1, "Informe um título"),
  theme: z.string().min(1, "Informe um tema"),
  verse: z.string().optional().default(""),
  style: z.string().optional().default(""),
  size: z.string().optional().default("media"),
  basePrompt: z.string().optional().default(""),
  optionalLink: z.string().optional().default(""),
  active: z.boolean().default(true),
});

export async function saveDevotionalAction(
  id: string | null,
  input: z.input<typeof devotionalInput>,
): Promise<ActionState> {
  const parsed = devotionalInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const user = await getCurrentUser();
  const data = { ...parsed.data, optionalLink: parsed.data.optionalLink || null };
  if (id) await prisma.devotionalTemplate.update({ where: { id }, data });
  else await prisma.devotionalTemplate.create({ data: { ...data, userId: user.id } });
  revalidatePath("/devotionals");
  return { ok: true };
}

export async function deleteDevotionalAction(id: string): Promise<ActionState> {
  await prisma.devotionalTemplate.delete({ where: { id } });
  revalidatePath("/devotionals");
  return { ok: true };
}

// --------------------------- Motivacionais ---------------------------

const motivationalInput = z.object({
  title: z.string().min(1, "Informe um título"),
  objective: z.string().optional().default(""),
  intensity: z.string().optional().default("media"),
  style: z.string().optional().default(""),
  allowedThemes: z.array(z.string()).default([]),
  forbiddenThemes: z.array(z.string()).default([]),
  basePrompt: z.string().optional().default(""),
  active: z.boolean().default(true),
});

export async function saveMotivationalAction(
  id: string | null,
  input: z.input<typeof motivationalInput>,
): Promise<ActionState> {
  const parsed = motivationalInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error);
  const user = await getCurrentUser();
  if (id) await prisma.motivationalTemplate.update({ where: { id }, data: parsed.data });
  else
    await prisma.motivationalTemplate.create({
      data: { ...parsed.data, userId: user.id },
    });
  revalidatePath("/motivational");
  return { ok: true };
}

export async function deleteMotivationalAction(id: string): Promise<ActionState> {
  await prisma.motivationalTemplate.delete({ where: { id } });
  revalidatePath("/motivational");
  return { ok: true };
}

// ------------------------- Prompt Studio -------------------------

export async function updatePromptAction(
  id: string,
  content: string,
  active: boolean,
): Promise<ActionState> {
  if (!content.trim()) return { ok: false, error: "O conteúdo não pode ficar vazio" };
  const current = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!current) return { ok: false, error: "Prompt não encontrado" };
  await prisma.promptTemplate.update({
    where: { id },
    data: {
      content,
      active,
      // Bump de versão quando o conteúdo muda.
      version: content !== current.content ? current.version + 1 : current.version,
    },
  });
  revalidatePath("/prompt-studio");
  return { ok: true };
}

// --------------------------- Testes de IA ---------------------------

/** Gera uma amostra de devocional ou motivacional para o painel. */
export async function generateSampleAction(
  kind: "devotional" | "motivational",
  theme?: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  const text =
    kind === "devotional"
      ? await composeDevotional(user, { theme: theme ?? null })
      : await composeMotivational(user, { theme: theme ?? null });
  return { ok: true, message: text };
}
