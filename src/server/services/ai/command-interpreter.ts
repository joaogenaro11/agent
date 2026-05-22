import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { createLogger } from "@/lib/logger";
import { aiCommandResultSchema, INTENT_NAMES, type AICommandResult } from "./intents";
import { interpretWithRules } from "./fallback";
import { loadPromptContent } from "./prompts";
import type { AssistantContext } from "./context";

const log = createLogger("ai:interpreter");

function buildUserPrompt(message: string, ctx: AssistantContext): string {
  return [
    `Data/hora atual: ${ctx.nowISO} (fuso ${ctx.timezone})`,
    `Lembretes próximos: ${
      ctx.upcomingReminders.map((r) => `"${r.title}" (${r.dueAt})`).join("; ") || "nenhum"
    }`,
    `Hábitos ativos: ${
      ctx.activeHabits.map((h) => `${h.name} [${h.type}]`).join("; ") || "nenhum"
    }`,
    `Intenções válidas: ${INTENT_NAMES.join(", ")}`,
    "",
    `Mensagem do usuário: """${message}"""`,
  ].join("\n");
}

/**
 * Interpreta uma mensagem em linguagem natural e devolve uma intenção
 * estruturada e validada por Zod. Usa a IA quando há chave; caso contrário,
 * cai no interpretador por regras.
 */
export async function interpretCommand(
  message: string,
  ctx: AssistantContext,
): Promise<AICommandResult> {
  const openai = getOpenAI();
  if (!openai) {
    log.debug("sem OPENAI_API_KEY — usando interpretador por regras");
    return interpretWithRules(message, ctx.timezone);
  }

  try {
    const system = await loadPromptContent(ctx.user.id, "COMMAND_INTERPRETER");
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: buildUserPrompt(message, ctx) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = aiCommandResultSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      log.warn("resposta da IA não validou no schema — usando fallback", parsed.error.issues);
      return interpretWithRules(message, ctx.timezone);
    }
    return parsed.data;
  } catch (err) {
    log.error("falha ao interpretar com IA — usando fallback", err);
    return interpretWithRules(message, ctx.timezone);
  }
}
