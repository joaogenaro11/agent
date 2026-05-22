import { z } from "zod";

/** Lista de intenções suportadas pelo assistente. */
export const INTENT_NAMES = [
  "create_reminder",
  "update_reminder",
  "complete_reminder",
  "postpone_reminder",
  "cancel_reminder",
  "list_today",
  "create_routine",
  "log_habit",
  "get_habit_status",
  "get_75hard_status",
  "generate_devotional",
  "generate_motivational",
  "change_assistant_mode",
  "unknown",
] as const;

export type IntentName = (typeof INTENT_NAMES)[number];

const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]);
const modeEnum = z.enum(["NORMAL", "COBRANCA_ALTA", "LEVE", "FOCO", "DESCANSO"]);
const routineTypeEnum = z.enum([
  "MOTIVACIONAL",
  "DEVOCIONAL",
  "HABITO",
  "LEMBRETE",
  "CHECKLIST",
]);

/** União discriminada: cada intenção carrega seus próprios parâmetros. */
export const intentSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("create_reminder"),
    title: z.string().min(1),
    description: z.string().nullish(),
    category: z.string().nullish(),
    dueAt: z.string().describe("ISO 8601 com fuso, ex.: 2026-05-23T09:00:00-03:00"),
    hasSpecificTime: z.boolean().default(true),
    priority: priorityEnum.default("MEDIUM"),
    recurrenceType: recurrenceEnum.default("NONE"),
  }),
  z.object({
    intent: z.literal("update_reminder"),
    reminderQuery: z.string().min(1),
    newTitle: z.string().nullish(),
    newDueAt: z.string().nullish(),
  }),
  z.object({
    intent: z.literal("complete_reminder"),
    reminderQuery: z.string().min(1),
  }),
  z.object({
    intent: z.literal("postpone_reminder"),
    reminderQuery: z.string().min(1),
    newDueAt: z.string(),
  }),
  z.object({
    intent: z.literal("cancel_reminder"),
    reminderQuery: z.string().min(1),
  }),
  z.object({ intent: z.literal("list_today") }),
  z.object({
    intent: z.literal("create_routine"),
    name: z.string().min(1),
    weekdays: z.array(z.number().int().min(0).max(6)).default([]),
    time: z.string().regex(/^\d{1,2}:\d{2}$/),
    type: routineTypeEnum.default("MOTIVACIONAL"),
    baseContent: z.string().nullish(),
  }),
  z.object({
    intent: z.literal("log_habit"),
    habitName: z.string().min(1),
    value: z.number().nullish(),
    unit: z.string().nullish(),
    completed: z.boolean().nullish(),
  }),
  z.object({
    intent: z.literal("get_habit_status"),
    habitName: z.string().nullish(),
  }),
  z.object({ intent: z.literal("get_75hard_status") }),
  z.object({
    intent: z.literal("generate_devotional"),
    theme: z.string().nullish(),
    scheduleAt: z.string().nullish(),
  }),
  z.object({
    intent: z.literal("generate_motivational"),
    theme: z.string().nullish(),
    scheduleAt: z.string().nullish(),
  }),
  z.object({
    intent: z.literal("change_assistant_mode"),
    mode: modeEnum,
  }),
  z.object({ intent: z.literal("unknown") }),
]);

export type Intent = z.infer<typeof intentSchema>;

/** Resposta completa do interpretador de IA. */
export const aiCommandResultSchema = z.object({
  confidence: z.number().min(0).max(1).default(0.5),
  needsClarification: z.boolean().default(false),
  clarificationQuestion: z.string().nullish(),
  action: intentSchema,
});

export type AICommandResult = z.infer<typeof aiCommandResultSchema>;
