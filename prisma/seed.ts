import { PrismaClient } from "@prisma/client";
import { DEFAULT_PROMPTS } from "../src/server/services/ai/prompts";

const prisma = new PrismaClient();

function normalizePhone(raw: string | undefined): string {
  const value = (raw ?? "+5511999999999").replace(/^whatsapp:/, "").trim();
  return value || "+5511999999999";
}

async function main() {
  const phone = normalizePhone(process.env.MY_WHATSAPP_NUMBER);
  const timezone = process.env.DEFAULT_TIMEZONE ?? "America/Sao_Paulo";

  // ---- Usuário ----
  const user = await prisma.user.upsert({
    where: { email: "genastrb@gmail.com" },
    update: { phone, timezone },
    create: {
      name: "Genaro",
      email: "genastrb@gmail.com",
      phone,
      timezone,
    },
  });
  console.log(`Usuário: ${user.name} <${user.email}>`);

  // ---- Configurações do assistente ----
  await prisma.assistantSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      assistantName: "Nexus",
      userDisplayName: "Genaro",
      tone: "DIRETO",
      accountabilityLevel: "ALTO",
      messageLength: "MEDIA",
      allowSpiritualContent: true,
      motivationalStyle: "Direto, sem clichê, focado em constância e próximo passo.",
      devotionalStyle: "Curto, prático, com versículo e aplicação do dia.",
      forbiddenTopics: [],
      quietHoursStart: "22:30",
      quietHoursEnd: "06:30",
      timezone,
      allowEmojis: true,
      currentMode: "NORMAL",
    },
  });

  // ---- Prompts (Prompt Studio) ----
  await prisma.promptTemplate.deleteMany({ where: { userId: user.id } });
  for (const [type, def] of Object.entries(DEFAULT_PROMPTS)) {
    await prisma.promptTemplate.create({
      data: {
        userId: user.id,
        name: def.name,
        type: type as keyof typeof DEFAULT_PROMPTS,
        content: def.content,
        version: 1,
        active: true,
      },
    });
  }
  console.log(`Prompts inseridos: ${Object.keys(DEFAULT_PROMPTS).length}`);

  // ---- Desafio 75 Hard ----
  await prisma.hard75Challenge.deleteMany({ where: { userId: user.id } });
  await prisma.hard75Challenge.create({
    data: {
      userId: user.id,
      startDate: new Date(),
      durationDays: 75,
      currentDay: 1,
      targetWaterMl: 3000,
      targetPages: 10,
      rules:
        "2 treinos (1 ao ar livre), dieta sem furos, 3L de água, 10 páginas de leitura, foto de progresso.",
      checkInTimes: ["07:00", "13:00", "21:00"],
      active: true,
    },
  });

  // ---- Hábitos ----
  await prisma.habit.deleteMany({ where: { userId: user.id } });
  await prisma.habit.createMany({
    data: [
      {
        userId: user.id,
        name: "Água",
        description: "Meta diária de hidratação",
        type: "NUMERIC",
        targetValue: 3000,
        unit: "ml",
        reminderTime: "10:00",
      },
      {
        userId: user.id,
        name: "Leitura bíblica",
        description: "Leitura diária da Bíblia",
        type: "BOOLEAN",
        reminderTime: "22:00",
      },
      {
        userId: user.id,
        name: "Ler livro",
        description: "Leitura de desenvolvimento",
        type: "NUMERIC",
        targetValue: 10,
        unit: "páginas",
      },
      { userId: user.id, name: "Treino 1", type: "BOOLEAN", reminderTime: "07:00" },
      { userId: user.id, name: "Treino 2", type: "BOOLEAN", reminderTime: "18:00" },
      { userId: user.id, name: "Foto de progresso", type: "BOOLEAN" },
      { userId: user.id, name: "Dieta", type: "BOOLEAN" },
    ],
  });
  console.log("Hábitos criados.");

  // ---- Lembretes de demonstração ----
  await prisma.reminder.deleteMany({ where: { userId: user.id } });
  const inHours = (h: number) => new Date(Date.now() + h * 3600_000);
  await prisma.reminder.createMany({
    data: [
      {
        userId: user.id,
        title: "Revisar metas da semana",
        description: "Bloco de 25 minutos",
        category: "produtividade",
        priority: "HIGH",
        dueAt: inHours(2),
        source: "WEB",
      },
      {
        userId: user.id,
        title: "Comprar leite",
        category: "casa",
        priority: "LOW",
        dueAt: inHours(26),
        source: "WHATSAPP",
      },
      {
        userId: user.id,
        title: "Ligar para o Alan",
        priority: "MEDIUM",
        dueAt: inHours(-1),
        source: "WEB",
      },
    ],
  });

  // ---- Rotinas ----
  await prisma.routine.deleteMany({ where: { userId: user.id } });
  await prisma.routine.createMany({
    data: [
      {
        userId: user.id,
        name: "Motivacional da manhã",
        description: "Mensagem para começar o dia",
        weekdays: [1, 2, 4],
        time: "06:00",
        type: "MOTIVACIONAL",
        baseContent: "Comece o dia com foco no próximo passo.",
      },
      {
        userId: user.id,
        name: "Devocional diário",
        weekdays: [],
        time: "09:00",
        type: "DEVOCIONAL",
        baseContent: "disciplina",
      },
      {
        userId: user.id,
        name: "Cobrança leitura bíblica",
        weekdays: [],
        time: "22:00",
        type: "LEMBRETE",
        baseContent: "Você já leu a Bíblia hoje?",
      },
    ],
  });

  // ---- Mensagens programadas ----
  await prisma.scheduledMessage.deleteMany({ where: { userId: user.id } });
  await prisma.scheduledMessage.createMany({
    data: [
      {
        userId: user.id,
        type: "PLANEJAMENTO_DIARIO",
        title: "Planejamento do dia",
        basePrompt: "Liste as prioridades e hábitos do dia.",
        time: "08:00",
        weekdays: [],
      },
      {
        userId: user.id,
        type: "REVISAO_DIARIA",
        title: "Revisão do dia",
        basePrompt: "Revise o que foi concluído e o que ficou pendente.",
        time: "22:15",
        weekdays: [],
      },
    ],
  });

  // ---- Templates ----
  await prisma.devotionalTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.devotionalTemplate.create({
    data: {
      userId: user.id,
      title: "Devocional — Disciplina",
      theme: "disciplina",
      verse: "1 Coríntios 9:27",
      style: "Curto e prático",
      size: "media",
      basePrompt: "Devocional sobre disciplina e constância.",
      active: true,
    },
  });

  await prisma.motivationalTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.motivationalTemplate.create({
    data: {
      userId: user.id,
      title: "Motivacional — Foco",
      objective: "Manter o foco no próximo passo",
      intensity: "alta",
      style: "Direto, sem clichê",
      allowedThemes: ["disciplina", "constância", "foco"],
      forbiddenThemes: [],
      basePrompt: "Mensagem motivacional sobre foco e ação.",
      active: true,
    },
  });

  // ---- Integrações ----
  await prisma.integrationConnection.upsert({
    where: { userId_provider: { userId: user.id, provider: "apple_reminders" } },
    update: {},
    create: {
      userId: user.id,
      provider: "apple_reminders",
      status: "DISCONNECTED",
      metadata: { note: "Requer bridge macOS/iOS via EventKit. Veja o README." },
    },
  });

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
