import "./load-env";
import { runSchedulerTick } from "../src/server/services/scheduler/tick";

/**
 * Execução avulsa do scheduler tick — útil para testes manuais.
 * Uso: `npm run tick:once`
 */
runSchedulerTick()
  .then((result) => {
    console.log("Resultado do tick:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Falha no tick:", err);
    process.exit(1);
  });
