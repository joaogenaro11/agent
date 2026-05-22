#!/usr/bin/env bash
# ============================================================
# Setup do Assessor Pessoal de IA — execute uma vez.
# Instala dependências, prepara o ambiente, sobe o banco,
# aplica as migrations e roda o seed.
#
# Uso:  npm run setup     (ou:  bash scripts/setup.sh)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m!  %s\033[0m\n" "$1"; }

# --- 1. Node ---
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js não encontrado. Instale o Node 20+ e tente de novo."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ é necessário (atual: $(node -v))."
  exit 1
fi
say "Node $(node -v) OK"

# --- 2. Dependências ---
say "Instalando dependências (npm install)"
npm install

# --- 3. Arquivo de ambiente ---
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  say "Criado .env.local a partir de .env.example"
  warn "Edite .env.local para configurar OPENAI_API_KEY e o Twilio (opcional)."
else
  say ".env.local já existe — mantido"
fi

# --- 4. Banco de dados ---
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  say "Subindo o PostgreSQL via Docker"
  docker compose up -d
  printf "Aguardando o banco ficar pronto"
  for _ in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
      printf " pronto!\n"
      break
    fi
    printf "."
    sleep 1
  done
else
  warn "Docker não encontrado. Garanta um PostgreSQL acessível e ajuste"
  warn "DATABASE_URL em .env.local antes de continuar."
fi

# --- 5. Migrations + seed ---
say "Aplicando migrations (prisma migrate deploy)"
npm run db:deploy

say "Populando dados iniciais (prisma db seed)"
npm run db:seed

say "Setup concluído!"
echo "Agora rode:  npm run start:all   (sobe o painel web + o worker)"
