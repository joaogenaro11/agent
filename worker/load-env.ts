import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega variáveis de .env / .env.local para process.env.
 * É importado ANTES de qualquer módulo que leia env, pois processos tsx
 * (worker, seed) não carregam arquivos .env automaticamente.
 */
for (const file of [".env", ".env.local"]) {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1];
      const value = match[2].replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // arquivo ausente — segue com as variáveis já presentes no ambiente
  }
}
