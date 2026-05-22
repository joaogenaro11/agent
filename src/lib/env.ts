import { z } from "zod";

/**
 * Validação leve de variáveis de ambiente.
 * Tudo é opcional exceto DATABASE_URL para não quebrar o `next build`;
 * a ausência de chaves opcionais coloca o sistema em "modo degradado".
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().optional().default("gpt-4o-mini"),
  APP_URL: z.string().optional().default("http://localhost:3000"),
  DEFAULT_TIMEZONE: z.string().optional().default("America/Sao_Paulo"),
  WHATSAPP_PROVIDER: z
    .enum(["twilio", "mock", "meta", "twilio_business"])
    .optional()
    .default("mock"),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_WHATSAPP_FROM: z.string().optional().default(""),
  MY_WHATSAPP_NUMBER: z.string().optional().default(""),
  TWILIO_VALIDATE_SIGNATURE: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),
  META_WHATSAPP_TOKEN: z.string().optional().default(""),
  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  META_WHATSAPP_VERIFY_TOKEN: z.string().optional().default(""),
  JOB_RUNNER_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração de ambiente inválida. Verifique seu .env.local");
}

export const env = parsed.data;

export const hasOpenAI = env.OPENAI_API_KEY.length > 0;
