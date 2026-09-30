#!/usr/bin/env bash
# Gera os arquivos .env de mobile/ e web/ a partir do arquivo de segredos,
# que fica FORA do repositório. Nunca imprime valores.
#
# Uso: scripts/gerar-env.sh [caminho-do-env-de-segredos]
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEGREDOS="${1:-$HOME/arquiteturas_convergentes/segredos/nupdec-conecta.env}"

if [[ ! -f "$SEGREDOS" ]]; then
  echo "arquivo de segredos não encontrado: $SEGREDOS" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SEGREDOS"
set +a

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF vazio}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY vazio}"
URL="https://${SUPABASE_PROJECT_REF}.supabase.co"

mkdir -p "$RAIZ/mobile" "$RAIZ/web"

cat > "$RAIZ/mobile/.env" <<EOF
# gerado por scripts/gerar-env.sh — não commitar
EXPO_PUBLIC_SUPABASE_URL=${URL}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF

cat > "$RAIZ/web/.env" <<EOF
# gerado por scripts/gerar-env.sh — não commitar
VITE_SUPABASE_URL=${URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_MAP_STYLE_URL=${MAP_STYLE_URL:-https://tiles.openfreemap.org/styles/liberty}
VITE_APK_VERSION=${VITE_APK_VERSION:-0.1.0}
VITE_APK_URL=${VITE_APK_URL:-/downloads/nupdec-conecta.apk}
EOF

chmod 600 "$RAIZ/mobile/.env" "$RAIZ/web/.env"
echo "ok: mobile/.env e web/.env gerados (ref ${SUPABASE_PROJECT_REF:0:4}…)"
