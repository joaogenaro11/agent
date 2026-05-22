# Assessor Pessoal de IA

Assistente pessoal via **WhatsApp** com **painel web**: lembretes, rotinas,
hábitos, desafio 75 Hard, mensagens motivacionais e devocionais — tudo com
mensagens humanizadas geradas por IA e um scheduler que dispara no horário certo.

O sistema é single-user no MVP, mas toda a modelagem (`User` + `userId` em todas
as entidades) já está pronta para multiusuário.

---

## Visão geral

- **Painel web** com 13 páginas (dashboard, lembretes, rotinas, mensagens
  programadas, hábitos, 75 Hard, devocionais, motivacionais, configurações,
  teste de WhatsApp, logs, Prompt Studio e integrações).
- **WhatsApp** com camada de provedor abstrata. MVP usa o **Twilio WhatsApp
  Sandbox**; há `mock` para desenvolvimento e stubs para Meta Cloud API e Twilio
  Business.
- **Interpretação por IA** (`AICommandInterpreter`): entende comandos em
  linguagem natural e devolve uma intenção estruturada validada por Zod.
- **Mensagens humanizadas** (`MessageComposer`): varia o texto conforme tom,
  nível de cobrança, modo atual e histórico recente.
- **Scheduler** (pg-boss) que dispara lembretes, rotinas, mensagens programadas
  e cobranças de hábito, respeitando fuso e quiet hours, sem envios duplicados.

### Modo degradado (sem OpenAI)

Se `OPENAI_API_KEY` não estiver definida, o sistema funciona em **modo
degradado**: a interpretação de comandos usa um parser por regras (regex) e as
mensagens usam templates variados. Útil para desenvolver e demonstrar sem custo
de API. Com a chave, a IA assume a interpretação e a geração de texto.

---

## Arquitetura

```
prisma/            schema (16 modelos), migrations e seed
src/
  app/             rotas Next.js (App Router)
    (app)/         painel web com sidebar
    api/webhooks/  webhook de entrada do WhatsApp
  components/      UI (estilo shadcn) e componentes de feature
  lib/             db, env, datetime (luxon), openai, logger, rate-limit
  server/
    actions/       server actions (CRUDs do painel)
    services/
      whatsapp/    WhatsAppProvider + Twilio/Mock/Meta(stub)/Business(stub)
      ai/          interpretador, composer, intents (Zod), prompts, fallback
      scheduler/   tick do scheduler
      messaging/   entrega com deduplicação
      reminders/ habits/ hard75/   lógica de domínio
      external-reminders/  ReminderExternalProvider + Apple (stub)
    command-router.ts   intenção -> ação -> resposta humanizada
worker/            processo do pg-boss (scheduler) + tick avulso
tests/             testes com Vitest
```

**Fluxo de uma mensagem recebida:** webhook salva a mensagem → resolve o usuário
pelo telefone → `AICommandInterpreter` classifica a intenção → `command-router`
executa a ação de domínio → `MessageComposer` gera a resposta → resposta enviada
pelo WhatsApp → tudo registrado em logs.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · UI estilo shadcn/ui ·
PostgreSQL · Prisma · pg-boss · OpenAI · Twilio · Zod · Luxon · Vitest.

### Decisões técnicas

- **Luxon** (em vez de date-fns): tratamento nativo de fuso/DST, essencial para
  quiet hours e agendamento por timezone.
- **pg-boss** (em vez de BullMQ): jobs sobre o próprio PostgreSQL, sem Redis. O
  scheduler roda num **processo worker dedicado** (`npm run worker`), separado do
  Next.js, porque o modelo serverless não hospeda um agendador de longa duração.
- **Sem login no MVP**: acesso direto ao painel com um usuário fixo (seed). A
  tabela `User` e `userId` em todas as entidades já suportam multiusuário.

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Configurar o ambiente
cp .env.example .env.local
#   edite .env.local: DATABASE_URL e, opcionalmente, OPENAI_API_KEY / Twilio

# 3. Banco: aplicar migrations e popular o seed
npm run db:deploy
npm run db:seed

# 4. Subir a aplicação web
npm run dev          # http://localhost:3000

# 5. Em outro terminal, subir o worker do scheduler
npm run worker
```

### Configurar o banco

Aponte `DATABASE_URL` para um PostgreSQL acessível, por exemplo:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/assessor_ia"
```

- `npm run db:migrate` — cria/aplica migrations em desenvolvimento.
- `npm run db:deploy` — aplica as migrations existentes (produção/CI).
- `npm run db:seed` — cria o usuário, as configurações, hábitos, desafio 75 Hard,
  prompts e dados de demonstração.
- `npm run db:reset` — recria o banco do zero e roda o seed.

---

## Configurar o Twilio WhatsApp Sandbox

O MVP usa o **Twilio WhatsApp Sandbox** — gratuito e sem aprovação de número.

1. Crie uma conta no [Twilio](https://www.twilio.com/) e abra
   **Messaging → Try it out → Send a WhatsApp message**.
2. O Sandbox mostra um número (ex.: `+1 415 523 8886`) e um código de adesão
   (ex.: `join orange-tiger`).
3. **Conectar seu WhatsApp ao Sandbox:** do seu celular, envie o código de adesão
   (`join ...`) para o número do Sandbox. A partir daí seu número pode trocar
   mensagens com o Sandbox por 72 horas (renovável reenviando o código).
4. No `.env.local`, preencha:
   ```
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   MY_WHATSAPP_NUMBER=whatsapp:+55SEUNUMERO
   ```
5. **Webhook:** em **Sandbox settings**, no campo *"When a message comes in"*,
   coloque a URL pública do seu webhook:
   ```
   https://SEU_DOMINIO/api/webhooks/whatsapp
   ```
   Em desenvolvimento, exponha o `localhost` com um túnel (ex.: `ngrok http 3000`)
   e use a URL gerada.
6. (Opcional) `TWILIO_VALIDATE_SIGNATURE=true` ativa a validação da assinatura
   `X-Twilio-Signature` no webhook. Exige que `APP_URL` seja exatamente a URL
   pública configurada no Twilio.

> Sem Twilio configurado, mantenha `WHATSAPP_PROVIDER=mock`: nada é enviado de
> verdade e os envios ficam registrados em memória/logs.

---

## Como testar

### Testar o envio de mensagem

Acesse **`/whatsapp-test`** no painel:

- **Enviar mensagem de teste**: dispara uma mensagem pelo provedor ativo.
- **Simular mensagem recebida**: executa o pipeline completo (interpretação →
  ação → resposta) sem depender do Twilio. Ótimo para validar comandos.

### Testar o webhook

Simule uma mensagem do Twilio com `curl`:

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "From=whatsapp:+55SEUNUMERO" \
  --data-urlencode "To=whatsapp:+14155238886" \
  --data-urlencode "Body=Me lembra amanhã às 9h de comprar leite" \
  --data-urlencode "MessageSid=SM123"
```

A resposta humanizada é enviada de volta pelo provedor e registrada em `/logs`.

### Testar um lembrete

1. Crie um lembrete em `/reminders` com vencimento próximo e canal WhatsApp.
2. Garanta que o worker está rodando (`npm run worker`).
3. No horário, o scheduler envia o lembrete e registra a entrega.

### Testar o scheduler

Execução avulsa do tick (sem precisar do worker):

```bash
npm run tick:once
```

O tick varre lembretes, rotinas, mensagens programadas e hábitos pendentes,
respeita fuso e quiet hours, e nunca envia o mesmo disparo duas vezes.

### Testes automatizados

```bash
npm test
```

Cobre: interpretação de comandos, criação de lembrete, registro de água, status
do 75 Hard, deduplicação do scheduler, `MockWhatsAppProvider` e `MessageComposer`.

### Comandos que funcionam pelo WhatsApp

- "Me lembra amanhã às 9h de comprar leite."
- "Adiciona comprar leite na minha lista."
- "Bebi 750ml." / "Concluí o treino 1." / "Li 10 páginas."
- "O que tenho hoje?" / "Como está meu 75 Hard?"
- "Cancela o lembrete de comprar leite." / "Adia esse lembrete para amanhã."
- "Modo cobrança alta hoje."
- "Me manda um devocional sobre disciplina amanhã às 9."

---

## Comportamento do MVP

- **Quiet hours**: se um disparo cairia dentro da janela de silêncio, ele é
  **adiado** para depois do fim da janela (a condição de disparo é `>=`, então um
  tick posterior envia a mesma ocorrência). Mensagens não são descartadas.
- **Recorrência**: `daily`, `weekly` e `monthly` são calculadas com Luxon;
  `custom` usa uma regra simples (dias da semana + horário). RRULE completo é um
  próximo passo.
- **Deduplicação**: `MessageDeliveryLog` tem índice único
  `(relatedEntityType, relatedEntityId, scheduledFor)`. A linha é criada antes do
  envio; uma colisão significa "já entregue" e o disparo é ignorado.

---

## Integração futura — Apple Reminders

Não há integração real com o Apple Reminders no MVP, **por um motivo técnico**: o
acesso aos lembretes da Apple depende do framework **EventKit**, que exige
permissão local do usuário no dispositivo (macOS/iOS). Não existe API de servidor
oficial, e o backend não deve acessar o iCloud por meios não oficiais.

A arquitetura já está preparada:

- Interface `ReminderExternalProvider` (`listReminders`, `createReminder`,
  `updateReminder`, `completeReminder`, `deleteReminder`, `sync`).
- `AppleRemindersProvider` (stub documentado) implementando a interface.
- O modelo `Reminder` tem `externalId` e `source = APPLE_REMINDERS_FUTURE`;
  `IntegrationConnection` guarda o estado da conexão.

**Plano futuro:** um app/bridge macOS ou iOS usando EventKit expõe um endpoint
local autenticado; o `AppleRemindersProvider` passa a consumir esse bridge.

## Migração futura — Meta WhatsApp Cloud API

A camada `WhatsAppProvider` abstrai envio e recebimento. Migrar para a **Meta
WhatsApp Cloud API** (ou para o **Twilio WhatsApp Business** oficial) é
implementar a interface e ajustar a factory (`WHATSAPP_PROVIDER`).

Os stubs `MetaWhatsAppProvider` e `TwilioBusinessWhatsAppProvider` já existem. A
migração precisará tratar:

- Token permanente e Phone Number ID (Cloud API).
- **Templates de mensagem aprovados** para iniciar conversas.
- **Janela de conversa de 24 horas**: fora dela, só templates aprovados podem ser
  enviados. O `MessageDeliveryLog` e o histórico de `WhatsAppMessage` dão a base
  para esse controle.

---

## Limitações do MVP

- Sem autenticação — acesso direto ao painel (single-user).
- Recorrência simples; sem RRULE completo.
- Apple Reminders e Meta Cloud API são stubs.
- Rate limit do webhook é em memória (adequado a uma instância).
- O worker do scheduler precisa rodar como processo separado.

## Próximos passos

1. Autenticação e suporte real a multiusuário.
2. Bridge macOS/iOS (EventKit) para o Apple Reminders.
3. Migração para a Meta WhatsApp Cloud API com templates e janela de 24h.
4. Recorrência via RRULE e `reminderOffsets` (avisos antecipados).
5. Métricas de constância (streaks) e relatórios.

---

## Variáveis de ambiente

Veja `.env.example`. Principais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (obrigatória) |
| `OPENAI_API_KEY` | Chave da OpenAI (opcional — sem ela, modo degradado) |
| `OPENAI_MODEL` | Modelo usado (padrão `gpt-4o-mini`) |
| `WHATSAPP_PROVIDER` | `twilio` \| `mock` \| `meta` \| `twilio_business` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Credenciais do Twilio |
| `TWILIO_WHATSAPP_FROM` | Número do Sandbox/Business |
| `MY_WHATSAPP_NUMBER` | Seu número (usado pelo seed) |
| `DEFAULT_TIMEZONE` | Fuso padrão (`America/Sao_Paulo`) |
| `JOB_RUNNER_ENABLED` | Liga o agendamento no worker |

> Nunca comite `.env.local`. Apenas `.env.example` vai para o repositório.
