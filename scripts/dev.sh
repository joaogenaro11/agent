#!/usr/bin/env bash
# ============================================================
# Sobe o painel web (Next.js) e o worker do scheduler juntos.
# Encerra os dois ao pressionar Ctrl+C.
#
# Uso:  npm run start:all   (ou:  bash scripts/dev.sh)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "Dependências não instaladas. Rode primeiro:  npm run setup"
  exit 1
fi

PIDS=""
cleanup() {
  echo ""
  echo "Encerrando processos..."
  # shellcheck disable=SC2086
  [ -n "$PIDS" ] && kill $PIDS 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> Iniciando o worker do scheduler"
npm run worker &
PIDS="$PIDS $!"

echo "==> Iniciando o painel web em http://localhost:3000"
npm run dev &
PIDS="$PIDS $!"

# Mantém o script vivo enquanto os processos rodam (Ctrl+C encerra ambos).
wait
