#!/usr/bin/env bash
# Carrega os 5.570 municípios do IBGE na tabela public.municipios (idempotente).
# Uso: PGPASSWORD=... scripts/importar-municipios-ibge.sh <host> <usuario>
set -euo pipefail
HOST="${1:?host}"; USUARIO="${2:?usuario}"
TMP="$(mktemp -d)"
curl -s "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado&orderBy=nome" -o "$TMP/m.json"
python3 - "$TMP/m.json" "$TMP/m.sql" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
with open(sys.argv[2], "w") as f:
    f.write("insert into public.municipios (codigo_ibge, nome, uf) values\n")
    f.write(",\n".join(f"('{m['municipio-id']}', '{m['municipio-nome'].replace(chr(39), chr(39)*2)}', '{m['UF-sigla']}')" for m in d))
    f.write("\non conflict (codigo_ibge) do nothing;\n")
PY
psql -h "$HOST" -p 5432 -U "$USUARIO" -d postgres -v ON_ERROR_STOP=1 -q -f "$TMP/m.sql"
echo "ok: municípios importados"
