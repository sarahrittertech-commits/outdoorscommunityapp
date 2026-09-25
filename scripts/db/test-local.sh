#!/usr/bin/env bash
# Run the database permission tests on plain Postgres, without Docker.
#
# Normal path (Docker available):  npm run db:test   -> supabase test db
# This path (no Docker):           npm run db:test:local
#
# Needs: psql, pg_prove and the pgTAP extension, and a Postgres server you
# can create databases on. Connection comes from the usual PG* variables.
#
#   PGHOST=/tmp PGPORT=54329 PGUSER=postgres npm run db:test:local

set -euo pipefail

cd "$(dirname "$0")/../.."

DB="${TEST_DB:-community_board_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB} with (force)" >/dev/null
"${PSQL[@]}" -d postgres -c "create database ${DB}" >/dev/null

"${PSQL[@]}" -d "${DB}" -f scripts/db/supabase-shim.sql >/dev/null

for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "${DB}" -f "$f" >/dev/null
done

if [[ "${1:-}" == "--seed" ]]; then
  "${PSQL[@]}" -d "${DB}" -f supabase/seed.sql >/dev/null
  echo "Migrations and seed data applied to ${DB}."
  exit 0
fi

pg_prove -d "${DB}" supabase/tests/*.sql
