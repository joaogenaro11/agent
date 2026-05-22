"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const settingsInput = z.object({
  assistantName: z.string().min(1, "Informe o nome do assistente"),
  userDisplayName: z.string().min(1, "Informe seu nome"),
  tone: z.enum(["LEVE", "DIRETO", "INTENSO", "ESPIRITUAL", "EXECUTIVO", "AMIGAVEL"]),
  accountabilityLevel: z.enum(["BAIXO", "MEDIO", "ALTO"]),
  messageLength: z.enum(["CURTA", "MEDIA", "DETALHADA"]),
  currentMode: z.enum(["NORMAL", "COBRANCA_ALTA", "LEVE", "FOCO", "DESCANSO"]),
  allowSpiritualContent: z.boolean(),
  allowEmojis: z.boolean(),
  motivationalStyle: z.string().optional().default(""),
  devotionalStyle: z.string().optional().default(""),
  forbiddenTopics: z.array(z.string()).default([]),
  quietHoursStart: z.string().regex(/^\d{1,2}:\d{2}$/, "Horário inválido"),
  quietHoursEnd: z.string().regex(/^\d{1,2}:\d{2}$/, "Horário inválido"),
  timezone: z.string().min(1),
});

export type SettingsActionState = { ok: boolean; error?: string };

/** Atualiza a configuração de personalidade do assistente. */
export async function updateSettingsAction(
  input: z.input<typeof settingsInput>,
): Promise<SettingsActionState> {
  const parsed = settingsInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await getCurrentUser();
  await prisma.assistantSettings.update({
    where: { userId: user.id },
    data: parsed.data,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { timezone: parsed.data.timezone },
  });
  revalidatePath("/settings");
  return { ok: true };
}
