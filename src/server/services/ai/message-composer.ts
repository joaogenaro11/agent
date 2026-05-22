import type { AssistantSettings, Habit, Reminder } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { createLogger } from "@/lib/logger";
import { nowInZone, formatPt } from "@/lib/datetime";
import type { UserWithSettings } from "@/lib/current-user";
import type { PromptType } from "@prisma/client";
import { loadPromptContent } from "./prompts";
import { applyEmojiPreference, pickFresh, timeGreeting } from "./humanize";

const log = createLogger("ai:composer");

/** Descreve o estilo do assistente para a IA, a partir das configurações. */
function describeStyle(user: UserWithSettings): string {
  const s = user.settings;
  return [
    `Nome do assistente: ${s?.assistantName ?? "Nexus"}`,
    `Nome do usuário: ${s?.userDisplayName ?? user.name}`,
    `Tom: ${s?.tone ?? "DIRETO"}`,
    `Nível de cobrança: ${s?.accountabilityLevel ?? "MEDIO"}`,
    `Tamanho da mensagem: ${s?.messageLength ?? "MEDIA"}`,
    `Modo atual: ${s?.currentMode ?? "NORMAL"}`,
    `Emojis: ${s?.allowEmojis ? "permitidos com moderação" : "proibidos"}`,
    `Conteúdo espiritual: ${s?.allowSpiritualContent ? "permitido" : "não permitido"}`,
    s?.forbiddenTopics?.length
      ? `Tópicos proibidos: ${s.forbiddenTopics.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Últimas mensagens enviadas — usadas para evitar repetição de texto. */
async function recentMessages(userId: string, limit = 8): Promise<string[]> {
  const logs = await prisma.messageDeliveryLog.findMany({
    where: { userId, messageBody: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map((l) => l.messageBody ?? "").filter(Boolean);
}

interface GenerateOptions {
  user: UserWithSettings;
  promptType: PromptType;
  instruction: string;
  fallback: (recent: string[]) => string;
}

/** Gera texto via IA quando disponível; senão, usa o template de fallback. */
async function generate(opts: GenerateOptions): Promise<string> {
  const { user } = opts;
  const settings = user.settings;
  const recent = await recentMessages(user.id);
  const openai = getOpenAI();

  let text: string;
  if (!openai) {
    text = opts.fallback(recent);
  } else {
    try {
      const base = await loadPromptContent(user.id, opts.promptType);
      const system = `${base}\n\nEstilo do assistente:\n${describeStyle(user)}\n\nNão repita estas mensagens recentes:\n${recent.join("\n") || "(nenhuma)"}`;
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.9,
        messages: [
          { role: "system", content: system },
          { role: "user", content: opts.instruction },
        ],
      });
      text = completion.choices[0]?.message?.content?.trim() || opts.fallback(recent);
    } catch (err) {
      log.error("falha ao gerar mensagem com IA — usando template", err);
      text = opts.fallback(recent);
    }
  }
  return applyEmojiPreference(text, settings?.allowEmojis ?? true);
}

// --------------------------- Composições ---------------------------

/** Mensagem humanizada para um lembrete que está disparando. */
export function composeReminderMessage(user: UserWithSettings, reminder: Reminder) {
  const name = user.settings?.userDisplayName ?? user.name;
  return generate({
    user,
    promptType: "HABIT_MESSAGE",
    instruction: `Escreva um lembrete humanizado e curto sobre: "${reminder.title}"${
      reminder.description ? ` (${reminder.description})` : ""
    }. Prioridade: ${reminder.priority}.`,
    fallback: (recent) => {
      const pool = [
        `${name}, passando pra te lembrar: ${reminder.title}. Faz agora e me responde quando concluir.`,
        `Lembrete rápido, ${name}: ${reminder.title}. Você colocou isso como prioridade — bora.`,
        `${name}, é hora de ${reminder.title.toLowerCase()}. Pequeno passo, mas é constância.`,
        `Tá na agenda: ${reminder.title}. Resolve isso agora que depois você agradece, ${name}.`,
      ];
      return pickFresh(pool, recent);
    },
  });
}

/** Mensagem de cobrança/lembrete de um hábito. */
export function composeHabitMessage(user: UserWithSettings, habit: Habit) {
  const name = user.settings?.userDisplayName ?? user.name;
  return generate({
    user,
    promptType: "HABIT_MESSAGE",
    instruction: `Escreva uma mensagem curta cobrando o hábito "${habit.name}"${
      habit.targetValue ? ` (meta: ${habit.targetValue} ${habit.unit ?? ""})` : ""
    }.`,
    fallback: (recent) => {
      const pool = [
        `${name}, e o hábito "${habit.name}"? Não deixa passar hoje.`,
        `Check rápido: já cuidou de "${habit.name}" hoje? Constância pequena segura o dia.`,
        `${name}, foco no básico: "${habit.name}". Faz agora.`,
        `Bora manter a sequência de "${habit.name}", ${name}. Próximo passo é só fazer.`,
      ];
      return pickFresh(pool, recent);
    },
  });
}

/** Mensagem motivacional. */
export function composeMotivational(
  user: UserWithSettings,
  opts: { theme?: string | null; basePrompt?: string } = {},
) {
  const name = user.settings?.userDisplayName ?? user.name;
  return generate({
    user,
    promptType: "MOTIVATIONAL",
    instruction: `Escreva uma mensagem motivacional curta${
      opts.theme ? ` sobre "${opts.theme}"` : ""
    }.${opts.basePrompt ? ` Base: ${opts.basePrompt}` : ""}`,
    fallback: (recent) => {
      const pool = [
        `${name}, você não precisa estar motivado. Só precisa cumprir o próximo passo.`,
        `Bora, ${name}. Disciplina é fazer mesmo sem vontade. Hoje é mais um dia de construir.`,
        `${name}, ninguém vê o esforço de hoje — mas o resultado de amanhã denuncia. Faz teu dia.`,
        `Constância vence intensidade, ${name}. Um passo de cada vez, mas dá o passo.`,
      ];
      return pickFresh(pool, recent);
    },
  });
}

/** Devocional curto e estruturado. */
export function composeDevotional(
  user: UserWithSettings,
  opts: { theme?: string | null; verse?: string; basePrompt?: string } = {},
) {
  const tz = user.settings?.timezone ?? user.timezone;
  const greeting = timeGreeting(nowInZone(tz));
  const name = user.settings?.userDisplayName ?? user.name;
  if (user.settings && !user.settings.allowSpiritualContent) {
    return Promise.resolve(
      "Conteúdo espiritual está desativado nas suas configurações.",
    );
  }
  return generate({
    user,
    promptType: "DEVOTIONAL",
    instruction: `Escreva um devocional curto${
      opts.theme ? ` sobre "${opts.theme}"` : ""
    }${opts.verse ? `, usando o versículo "${opts.verse}"` : ""}.`,
    fallback: () => {
      const theme = opts.theme ?? "disciplina";
      return [
        `${greeting}, ${name}.`,
        ``,
        `Tema: ${theme}.`,
        opts.verse ? `Versículo: ${opts.verse}` : `"Tudo posso naquele que me fortalece." (Fp 4:13)`,
        ``,
        `Reflexão: ${theme} não nasce de um grande momento, mas de pequenas decisões repetidas. Deus honra quem é fiel no pouco.`,
        ``,
        `Aplicação: escolha hoje uma única coisa para fazer com excelência.`,
        ``,
        `Oração: que hoje você ande com firmeza e propósito. Amém.`,
      ].join("\n");
    },
  });
}

/** Mensagem de cobrança forte. */
export function composeAccountability(
  user: UserWithSettings,
  opts: { topic?: string } = {},
) {
  const name = user.settings?.userDisplayName ?? user.name;
  return generate({
    user,
    promptType: "ACCOUNTABILITY",
    instruction: `Escreva uma mensagem de cobrança curta e firme${
      opts.topic ? ` sobre "${opts.topic}"` : ""
    }.`,
    fallback: (recent) => {
      const pool = [
        `${name}, sem enrolar. ${opts.topic ?? "O que ficou pendente"} precisa ser feito hoje. Próximo passo, agora.`,
        `Olha, ${name}: você sabe o que falta. Para de adiar e fecha ${opts.topic ?? "isso"}.`,
        `${name}, cobrança real: ${opts.topic ?? "a pendência"} ainda está aberta. Resolve antes de dormir.`,
      ];
      return pickFresh(pool, recent);
    },
  });
}

/** Texto do disparo de uma ScheduledMessage, conforme seu tipo. */
export function composeScheduledMessage(
  user: UserWithSettings,
  type: string,
  opts: { title: string; basePrompt?: string },
) {
  switch (type) {
    case "MOTIVACIONAL":
      return composeMotivational(user, { basePrompt: opts.basePrompt });
    case "DEVOCIONAL":
      return composeDevotional(user, { basePrompt: opts.basePrompt });
    case "COBRANCA":
      return composeAccountability(user, { topic: opts.title });
    default: {
      const name = user.settings?.userDisplayName ?? user.name;
      const tz = user.settings?.timezone ?? user.timezone;
      return Promise.resolve(
        applyEmojiPreference(
          `${timeGreeting(nowInZone(tz))}, ${name}. ${opts.basePrompt || opts.title}`,
          user.settings?.allowEmojis ?? true,
        ),
      );
    }
  }
}

export { describeStyle, formatPt };

/** Resumo do uso do composer — exposto para o painel se necessário. */
export type { AssistantSettings };
