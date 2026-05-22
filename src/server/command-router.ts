import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/logger";
import { formatPt, toZoned } from "@/lib/datetime";
import { hasOpenAI, OPENAI_MODEL } from "@/lib/openai";
import type { UserWithSettings } from "@/lib/current-user";
import { buildContext } from "@/server/services/ai/context";
import { interpretCommand } from "@/server/services/ai/command-interpreter";
import type { Intent } from "@/server/services/ai/intents";
import {
  composeDevotional,
  composeMotivational,
} from "@/server/services/ai/message-composer";
import {
  cancelReminder,
  completeReminder,
  createReminder,
  findReminderByQuery,
  listToday,
  postponeReminder,
  rolloverRecurringReminder,
} from "@/server/services/reminders";
import { findHabitByName, formatHabitStatus, logHabit } from "@/server/services/habits";
import { formatHard75Status, syncFromHabit } from "@/server/services/hard75";

const log = createLogger("command-router");

/** Executa a intenção e devolve a resposta humanizada para o usuário. */
async function executeIntent(
  user: UserWithSettings,
  tz: string,
  action: Intent,
): Promise<string> {
  const name = user.settings?.userDisplayName ?? user.name;

  switch (action.intent) {
    case "create_reminder": {
      const due = new Date(action.dueAt);
      const reminder = await createReminder({
        userId: user.id,
        title: action.title,
        description: action.description ?? null,
        category: action.category ?? null,
        priority: action.priority,
        dueAt: due,
        hasSpecificTime: action.hasSpecificTime,
        recurrenceType: action.recurrenceType,
        source: "WHATSAPP",
      });
      const when = action.hasSpecificTime
        ? formatPt(reminder.dueAt, tz)
        : `${toZoned(reminder.dueAt, tz).toFormat("dd/MM/yyyy")} (sem horário definido)`;
      return `Fechado, ${name}. Anotei: "${reminder.title}" para ${when}. Eu te aviso.`;
    }

    case "complete_reminder": {
      const reminder = await findReminderByQuery(user.id, action.reminderQuery);
      if (!reminder) return `Não achei um lembrete com "${action.reminderQuery}". Pode reescrever?`;
      await completeReminder(reminder.id);
      await rolloverRecurringReminder(reminder, tz);
      return `Boa, ${name}. Marquei "${reminder.title}" como concluído.`;
    }

    case "postpone_reminder": {
      const reminder = await findReminderByQuery(user.id, action.reminderQuery);
      if (!reminder) return `Não achei esse lembrete. Pode me dizer o título?`;
      const updated = await postponeReminder(reminder.id, new Date(action.newDueAt));
      return `Pronto. "${updated.title}" foi adiado para ${formatPt(updated.dueAt, tz)}.`;
    }

    case "cancel_reminder": {
      const reminder = await findReminderByQuery(user.id, action.reminderQuery);
      if (!reminder) return `Não encontrei esse lembrete pra cancelar.`;
      await cancelReminder(reminder.id);
      return `Cancelado: "${reminder.title}".`;
    }

    case "update_reminder": {
      const reminder = await findReminderByQuery(user.id, action.reminderQuery);
      if (!reminder) return `Não achei esse lembrete pra editar.`;
      const updated = await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          title: action.newTitle ?? reminder.title,
          dueAt: action.newDueAt ? new Date(action.newDueAt) : reminder.dueAt,
        },
      });
      return `Atualizei: "${updated.title}" para ${formatPt(updated.dueAt, tz)}.`;
    }

    case "list_today": {
      const reminders = await listToday(user.id, tz);
      const habits = await formatHabitStatus(user.id, tz);
      const hard75 = await formatHard75Status(user.id, tz);
      const reminderLines =
        reminders.length > 0
          ? reminders
              .map((r) => `• ${r.title} — ${toZoned(r.dueAt, tz).toFormat("HH:mm")}`)
              .join("\n")
          : "Sem lembretes pra hoje.";
      return [
        `Seu dia, ${name}:`,
        ``,
        `Lembretes:`,
        reminderLines,
        ``,
        habits,
        ``,
        hard75,
      ].join("\n");
    }

    case "create_routine": {
      const routine = await prisma.routine.create({
        data: {
          userId: user.id,
          name: action.name,
          weekdays: action.weekdays,
          time: action.time,
          type: action.type,
          baseContent: action.baseContent ?? "",
        },
      });
      return `Rotina "${routine.name}" criada para ${routine.time}. Pode ajustar os detalhes no painel.`;
    }

    case "log_habit": {
      const habit = await findHabitByName(user.id, action.habitName);
      if (habit) {
        await logHabit(user.id, habit, tz, {
          value: action.value,
          completed: action.completed,
        });
      }
      const hard75 = await syncFromHabit(user.id, tz, action.habitName, {
        value: action.value,
        completed: action.completed,
      });

      if (hard75 && /agua|água|water/i.test(action.habitName)) {
        const { challenge, log: dlog } = hard75;
        const remaining = Math.max(0, challenge.targetWaterMl - dlog.waterMl);
        return `Boa. Registrei ${action.value ?? 0}ml. Você está com ${dlog.waterMl}ml/${challenge.targetWaterMl}ml hoje.${
          remaining > 0 ? ` Faltam ${remaining}ml — segue o ritmo.` : " Meta batida!"
        }`;
      }
      if (!habit && !hard75) {
        return `Não encontrei o hábito "${action.habitName}". Cadastra ele no painel que eu passo a cobrar.`;
      }
      return `Anotado, ${name}: "${action.habitName}" registrado. Constância é isso aí.`;
    }

    case "get_habit_status":
      return formatHabitStatus(user.id, tz);

    case "get_75hard_status":
      return formatHard75Status(user.id, tz);

    case "generate_devotional": {
      if (action.scheduleAt) {
        await createReminder({
          userId: user.id,
          title: `Devocional${action.theme ? ` — ${action.theme}` : ""}`,
          category: "devocional",
          dueAt: new Date(action.scheduleAt),
          source: "WHATSAPP",
        });
        return `Combinado. Te mando o devocional em ${formatPt(action.scheduleAt, tz)}.`;
      }
      return composeDevotional(user, { theme: action.theme });
    }

    case "generate_motivational": {
      if (action.scheduleAt) {
        await createReminder({
          userId: user.id,
          title: `Motivacional${action.theme ? ` — ${action.theme}` : ""}`,
          category: "motivacional",
          dueAt: new Date(action.scheduleAt),
          source: "WHATSAPP",
        });
        return `Fechado. Te mando essa mensagem em ${formatPt(action.scheduleAt, tz)}.`;
      }
      return composeMotivational(user, { theme: action.theme });
    }

    case "change_assistant_mode": {
      if (user.settings) {
        await prisma.assistantSettings.update({
          where: { id: user.settings.id },
          data: { currentMode: action.mode },
        });
      }
      return `Modo ajustado para ${action.mode.toLowerCase().replace("_", " ")}. Pode contar comigo, ${name}.`;
    }

    case "unknown":
    default:
      return `Não captei direito, ${name}. Você quer criar um lembrete, registrar um hábito ou ver seu dia?`;
  }
}

/**
 * Pipeline completo de uma mensagem recebida: interpreta, executa e
 * devolve a resposta. O salvamento da mensagem inbound fica no webhook.
 */
export async function processIncomingMessage(
  user: UserWithSettings,
  messageText: string,
): Promise<string> {
  const tz = user.settings?.timezone ?? user.timezone;
  const ctx = await buildContext(user);
  const result = await interpretCommand(messageText, ctx);

  let response: string;
  if (result.needsClarification || result.confidence < 0.4) {
    response =
      result.clarificationQuestion ??
      "Pode me dar um pouco mais de contexto? Não tenho certeza do que você quer.";
  } else {
    try {
      response = await executeIntent(user, tz, result.action);
    } catch (err) {
      log.error("falha ao executar intenção", err);
      response = "Tive um problema ao processar isso agora. Pode tentar de novo?";
    }
  }

  await prisma.aIInteractionLog.create({
    data: {
      userId: user.id,
      input: messageText,
      output: response,
      intent: result.action.intent,
      model: hasOpenAI ? OPENAI_MODEL : "rules-fallback",
    },
  });

  return response;
}
