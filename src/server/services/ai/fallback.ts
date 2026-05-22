import { DateTime } from "luxon";
import type { AICommandResult } from "./intents";

/**
 * Interpretador por regras (regex), usado quando não há OPENAI_API_KEY.
 * Cobre os comandos mais comuns para que o sistema seja demonstrável e
 * testável sem custo de API. Não substitui a IA — é um modo degradado.
 */

/** Extrai um horário ("9h", "09:30", "às 22") do texto. */
function extractTime(text: string): { hour: number; minute: number } | null {
  const hm = /\b(\d{1,2}):(\d{2})\b/.exec(text);
  if (hm) return { hour: Number(hm[1]), minute: Number(hm[2]) };
  const h = /\b(?:[àa]s\s+)?(\d{1,2})\s*h(?:oras?)?\b/i.exec(text);
  if (h) return { hour: Number(h[1]), minute: 0 };
  return null;
}

/** Interpreta data/hora relativa em pt-BR a partir de `now`. */
export function parsePtDateTime(
  text: string,
  now: DateTime,
): { dt: DateTime; hasSpecificTime: boolean } | null {
  const lower = text.toLowerCase();

  const rel = /\bem\s+(\d+)\s*(minutos?|min|horas?|h|dias?)\b/.exec(lower);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    if (unit.startsWith("min")) return { dt: now.plus({ minutes: n }), hasSpecificTime: true };
    if (unit.startsWith("h")) return { dt: now.plus({ hours: n }), hasSpecificTime: true };
    return { dt: now.plus({ days: n }), hasSpecificTime: false };
  }

  const time = extractTime(lower);
  let base = now;
  let dayMatched = false;

  if (/\bamanh[ãa]\b/.test(lower)) {
    base = now.plus({ days: 1 });
    dayMatched = true;
  } else if (/\bhoje\b/.test(lower)) {
    base = now;
    dayMatched = true;
  } else if (/\bdepois de amanh[ãa]\b/.test(lower)) {
    base = now.plus({ days: 2 });
    dayMatched = true;
  }

  if (time) {
    let dt = base.set({
      hour: time.hour,
      minute: time.minute,
      second: 0,
      millisecond: 0,
    });
    if (!dayMatched && dt < now) dt = dt.plus({ days: 1 });
    return { dt, hasSpecificTime: true };
  }

  if (dayMatched) {
    return {
      dt: base.set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
      hasSpecificTime: false,
    };
  }
  return null;
}

function result(action: AICommandResult["action"], confidence = 0.7): AICommandResult {
  return { confidence, needsClarification: false, action };
}

function clarify(question: string): AICommandResult {
  return {
    confidence: 0.3,
    needsClarification: true,
    clarificationQuestion: question,
    action: { intent: "unknown" },
  };
}

/** Interpreta a mensagem por regras. `tz` define o fuso para datas relativas. */
export function interpretWithRules(message: string, tz: string): AICommandResult {
  const text = message.trim();
  const lower = text.toLowerCase();
  const now = DateTime.now().setZone(tz);

  // --- Água ---
  const water = /\b(?:bebi|tomei|registr\w*)\b[^\d]*(\d+(?:[.,]\d+)?)\s*(ml|l|litros?|litro|copos?)/i.exec(
    text,
  );
  if (water) {
    let value = Number(water[1].replace(",", "."));
    const unit = water[2].toLowerCase();
    if (unit.startsWith("l")) value *= 1000;
    if (unit.startsWith("copo")) value *= 250;
    return result({ intent: "log_habit", habitName: "água", value, unit: "ml" });
  }

  // --- Treino ---
  const workout = /\btreino\s*([12])\b/i.exec(text);
  if (workout && /(conclu|fiz|feito|ok|terminei|completo|completei)/i.test(lower)) {
    return result({
      intent: "log_habit",
      habitName: `treino ${workout[1]}`,
      completed: true,
    });
  }

  // --- Leitura / páginas ---
  const pages = /\bli\s+(\d+)\s*p[áa]ginas?/i.exec(text);
  if (pages) {
    return result({
      intent: "log_habit",
      habitName: "leitura",
      value: Number(pages[1]),
      completed: true,
    });
  }
  if (/\b(li|terminei|conclu\w+)\b.*b[íi]blia/i.test(lower) || /b[íi]blia.*\b(lida|ok|sim)\b/i.test(lower)) {
    return result({ intent: "log_habit", habitName: "leitura bíblica", completed: true });
  }

  // --- Dieta / foto ---
  if (/\bdieta\b.*\b(ok|cumprida|feita|certa|sim|mantida)\b/i.test(lower)) {
    return result({ intent: "log_habit", habitName: "dieta", completed: true });
  }
  if (/\bfoto\b.*\b(feita|ok|tirada|pronta|sim)\b/i.test(lower) || /\bfoto de progresso\b/i.test(lower)) {
    return result({ intent: "log_habit", habitName: "foto de progresso", completed: true });
  }

  // --- Status ---
  if (/75\s*hard/i.test(lower)) {
    return result({ intent: "get_75hard_status" });
  }
  if (/(o que (tenho|tem)|como (est[áa]|t[áa]) (o )?meu dia|resumo do dia|minha agenda)/i.test(lower)) {
    return result({ intent: "list_today" });
  }
  if (/como.*(h[áa]bito|[áa]gua)/i.test(lower)) {
    return result({ intent: "get_habit_status" });
  }

  // --- Modo do assistente ---
  const mode = /modo\s+(cobran[çc]a\s*alta|foco|leve|descanso|normal)/i.exec(lower);
  if (mode) {
    const map: Record<string, AICommandResult["action"]> = {
      "cobranca alta": { intent: "change_assistant_mode", mode: "COBRANCA_ALTA" },
      "cobrança alta": { intent: "change_assistant_mode", mode: "COBRANCA_ALTA" },
      foco: { intent: "change_assistant_mode", mode: "FOCO" },
      leve: { intent: "change_assistant_mode", mode: "LEVE" },
      descanso: { intent: "change_assistant_mode", mode: "DESCANSO" },
      normal: { intent: "change_assistant_mode", mode: "NORMAL" },
    };
    const key = mode[1].toLowerCase().replace(/\s+/g, " ");
    if (map[key]) return result(map[key]);
  }

  // --- Devocional / motivacional ---
  if (/devocional/i.test(lower)) {
    const themeM = /sobre\s+([^,.]+)/i.exec(text);
    const when = parsePtDateTime(lower, now);
    return result({
      intent: "generate_devotional",
      theme: themeM ? themeM[1].trim() : null,
      scheduleAt: when ? when.dt.toISO() : null,
    });
  }
  if (/motivaciona/i.test(lower) && !/rotina/i.test(lower)) {
    const themeM = /sobre\s+([^,.]+)/i.exec(text);
    return result({
      intent: "generate_motivational",
      theme: themeM ? themeM[1].trim() : null,
      scheduleAt: null,
    });
  }

  // --- Cancelar / concluir / adiar lembrete ---
  if (/\bcancela\w*\b/i.test(lower)) {
    return result({
      intent: "cancel_reminder",
      reminderQuery: text.replace(/.*cancela\w*\s*(o|a|esse|essa|do)?\s*(lembrete\s*(de|do|da)?)?/i, "").trim() || text,
    });
  }
  if (/\badia\w*\b/i.test(lower)) {
    const when = parsePtDateTime(lower, now) ?? { dt: now.plus({ days: 1 }) };
    return result({
      intent: "postpone_reminder",
      reminderQuery: text.replace(/.*adia\w*\s*(esse|essa|o|a)?\s*(lembrete)?/i, "").replace(/para.*/i, "").trim() || text,
      newDueAt: when.dt.toISO()!,
    });
  }
  if (/(conclu[íi]\w*|terminei|finalizei).*(lembrete|tarefa)/i.test(lower)) {
    return result({
      intent: "complete_reminder",
      reminderQuery: text,
    });
  }

  // --- Criar rotina ---
  if (/\brotina\b/i.test(lower) && /(cria|criar|monta|configura)/i.test(lower)) {
    const time = extractTime(lower);
    const weekdays: number[] = [];
    const dayMap: [RegExp, number][] = [
      [/\bdomingo/i, 0],
      [/\bsegunda/i, 1],
      [/\bter[çc]a/i, 2],
      [/\bquarta/i, 3],
      [/\bquinta/i, 4],
      [/\bsexta/i, 5],
      [/\bs[áa]bado/i, 6],
    ];
    for (const [re, idx] of dayMap) if (re.test(lower)) weekdays.push(idx);
    return result({
      intent: "create_routine",
      name: /motivaciona/i.test(lower) ? "Rotina motivacional" : "Nova rotina",
      weekdays,
      time: time ? `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}` : "06:00",
      type: /devociona/i.test(lower)
        ? "DEVOCIONAL"
        : /motivaciona/i.test(lower)
          ? "MOTIVACIONAL"
          : "LEMBRETE",
      baseContent: null,
    });
  }

  // --- Criar lembrete ---
  if (/(me lembra|me lembre|lembrar de|cria\w* lembrete|adiciona|me cobra|cobra em)/i.test(lower)) {
    const when = parsePtDateTime(lower, now);
    // Título: trecho após "de"/"para", ou após "adiciona".
    let title = text;
    const ofM = /\b(?:de|para|pra)\s+(.+)$/i.exec(
      text.replace(/(me lembra\w*|me lembre)/i, "").replace(/\bem\s+\d+\s*\w+/i, ""),
    );
    const addM = /adiciona\s+(.+?)(?:\s+na\s+(?:minha\s+)?lista)?$/i.exec(text);
    if (addM) title = addM[1].trim();
    else if (ofM) title = ofM[1].replace(/\s+(amanh[ãa]|hoje|[àa]s\s+\d.*)$/i, "").trim();
    else title = text.replace(/(me lembra\w*|me lembre|me cobra)/i, "").trim();

    if (!when) {
      return clarify(
        `Fechado. Pra quando você quer esse lembrete${title ? ` de "${title}"` : ""}?`,
      );
    }
    return result(
      {
        intent: "create_reminder",
        title: title || "Lembrete",
        description: null,
        category: null,
        dueAt: when.dt.toISO()!,
        hasSpecificTime: when.hasSpecificTime,
        priority: "MEDIUM",
        recurrenceType: /todo dia|todos os dias|diariamente/i.test(lower)
          ? "DAILY"
          : "NONE",
      },
      0.6,
    );
  }

  return clarify(
    "Não entendi muito bem. Você quer criar um lembrete, registrar um hábito ou ver seu dia?",
  );
}
