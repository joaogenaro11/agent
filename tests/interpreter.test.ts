import { describe, it, expect } from "vitest";
import { interpretWithRules, parsePtDateTime } from "@/server/services/ai/fallback";
import { DateTime } from "luxon";

const TZ = "America/Sao_Paulo";

describe("interpretWithRules — interpretação de comandos", () => {
  it("interpreta registro de água", () => {
    const r = interpretWithRules("Bebi 750ml", TZ);
    expect(r.action.intent).toBe("log_habit");
    if (r.action.intent === "log_habit") {
      expect(r.action.habitName).toMatch(/[áa]gua/i);
      expect(r.action.value).toBe(750);
    }
  });

  it("converte litros em ml", () => {
    const r = interpretWithRules("Bebi 1.5 litros", TZ);
    expect(r.action.intent).toBe("log_habit");
    if (r.action.intent === "log_habit") expect(r.action.value).toBe(1500);
  });

  it("interpreta conclusão de treino", () => {
    const r = interpretWithRules("Concluí o treino 1", TZ);
    expect(r.action.intent).toBe("log_habit");
    if (r.action.intent === "log_habit") {
      expect(r.action.habitName).toBe("treino 1");
      expect(r.action.completed).toBe(true);
    }
  });

  it("interpreta pedido de status do dia", () => {
    expect(interpretWithRules("O que tenho hoje?", TZ).action.intent).toBe("list_today");
  });

  it("interpreta status do 75 Hard", () => {
    expect(interpretWithRules("Como está meu 75 Hard?", TZ).action.intent).toBe(
      "get_75hard_status",
    );
  });

  it("interpreta mudança de modo", () => {
    const r = interpretWithRules("Modo cobrança alta hoje", TZ);
    expect(r.action.intent).toBe("change_assistant_mode");
    if (r.action.intent === "change_assistant_mode") {
      expect(r.action.mode).toBe("COBRANCA_ALTA");
    }
  });

  it("interpreta criação de lembrete com data", () => {
    const r = interpretWithRules("Me lembra amanhã às 9h de comprar leite", TZ);
    expect(r.action.intent).toBe("create_reminder");
    if (r.action.intent === "create_reminder") {
      expect(r.action.title.toLowerCase()).toContain("comprar leite");
      expect(r.action.dueAt).toBeTruthy();
    }
  });

  it("pede esclarecimento quando não entende", () => {
    const r = interpretWithRules("blá blá blá xyz", TZ);
    expect(r.needsClarification).toBe(true);
  });
});

describe("parsePtDateTime", () => {
  it('resolve "amanhã às 9h"', () => {
    const now = DateTime.fromISO("2026-05-22T10:00:00", { zone: TZ });
    const parsed = parsePtDateTime("amanhã às 9h", now);
    expect(parsed?.dt.day).toBe(23);
    expect(parsed?.dt.hour).toBe(9);
  });

  it('resolve "em 30 minutos"', () => {
    const now = DateTime.fromISO("2026-05-22T10:00:00", { zone: TZ });
    const parsed = parsePtDateTime("em 30 minutos", now);
    expect(parsed?.dt.hour).toBe(10);
    expect(parsed?.dt.minute).toBe(30);
  });
});
