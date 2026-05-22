import "./load-env";
import { PgBoss } from "pg-boss";
import { env } from "../src/lib/env";
import { createLogger } from "../src/lib/logger";
import { runSchedulerTick } from "../src/server/services/scheduler/tick";

const log = createLogger("worker");
const QUEUE = "scheduler-tick";

/**
 * Processo worker dedicado.
 *
 * Hospeda o pg-boss e registra um job recorrente (cron a cada minuto) que
 * executa o scheduler tick. Roda separado do Next.js porque o modelo
 * serverless do Next não mantém um agendador de longa duração.
 *
 * Uso: `npm run worker`
 */
async function main() {
  if (!env.JOB_RUNNER_ENABLED) {
    log.warn("JOB_RUNNER_ENABLED=false — worker não iniciará o agendador.");
    return;
  }

  const boss = new PgBoss({ connectionString: env.DATABASE_URL });
  boss.on("error", (err: unknown) => log.error("erro no pg-boss", err));

  await boss.start();
  await boss.createQueue(QUEUE);

  await boss.work(QUEUE, async () => {
    try {
      await runSchedulerTick();
    } catch (err) {
      log.error("falha ao executar o tick", err);
      throw err;
    }
  });

  // Cron a cada minuto. pg-boss deduplica execuções concorrentes do schedule.
  await boss.schedule(QUEUE, "* * * * *");

  log.info("worker iniciado — scheduler tick agendado a cada minuto.");

  const shutdown = async () => {
    log.info("encerrando worker...");
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error("falha fatal no worker", err);
  process.exit(1);
});
