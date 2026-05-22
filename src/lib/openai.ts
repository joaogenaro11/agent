import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";

let client: OpenAI | null = null;

/** Retorna o cliente OpenAI, ou null quando não há chave configurada. */
export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI) return null;
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

export const OPENAI_MODEL = env.OPENAI_MODEL;
export { hasOpenAI };
