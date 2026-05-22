import { DateTime } from "luxon";

/** Escolhe um item aleatório de uma lista. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Escolhe um item evitando os recentemente usados (para não repetir texto).
 * Se todos já foram usados, cai no aleatório simples.
 */
export function pickFresh(arr: string[], recent: string[]): string {
  const fresh = arr.filter((x) => !recent.some((r) => r.includes(x.slice(0, 16))));
  return pick(fresh.length > 0 ? fresh : arr);
}

/** Saudação conforme o horário. */
export function timeGreeting(dt: DateTime): string {
  const h = dt.hour;
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu;

/** Remove emojis quando o usuário desativou o uso deles. */
export function applyEmojiPreference(text: string, allowEmojis: boolean): string {
  if (allowEmojis) return text;
  return text.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
}
