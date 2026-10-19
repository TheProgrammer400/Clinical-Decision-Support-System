#!/bin/sh
# Applies Prisma migrations safely. Never resets or drops data.
#
# Databases created by the old `prisma db push` startup have the original schema but no
# `_prisma_migrations` table. For those, the baseline migration (0_init, which is exactly
# the old schema) is marked as already applied, then the remaining migrations run normally.
set -eu

PRISMA="node ./node_modules/prisma/build/index.js"

has_table() {
  # `db execute` does not return rows, so probe with a statement that fails when absent.
  echo "SELECT 1 FROM \"$1\" LIMIT 1;" \
    | $PRISMA db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1
}

if ! has_table "_prisma_migrations" && has_table "users"; then
  echo "[migrate] Existing schema without migration history detected; baselining 0_init."
  $PRISMA migrate resolve --applied 0_init --schema prisma/schema.prisma
fi

$PRISMA migrate deploy --schema prisma/schema.prisma
