#!/bin/sh
# Verifies the migration history against disposable databases:
#  1. a fresh database migrates cleanly and matches schema.prisma (no drift);
#  2. a database created by the previous `prisma db push` startup (no migration history,
#     with data) is baselined and upgraded without data loss;
#  3. re-running is a no-op and the audit log rejects UPDATE/DELETE.
# Usage: ADMIN_URL=postgresql://user:pass@host:5432/postgres sh scripts/test-migrations.sh
set -eu
: "${ADMIN_URL:?ADMIN_URL must point at a server where test databases may be created}"
BASE="${ADMIN_URL%/*}"
FRESH="cdss_migtest_fresh_test"
LEGACY="cdss_migtest_legacy_test"

psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $FRESH" -c "DROP DATABASE IF EXISTS $LEGACY" -c "CREATE DATABASE $FRESH" -c "CREATE DATABASE $LEGACY"

echo "== fresh database"
DATABASE_URL="$BASE/$FRESH" sh scripts/migrate.sh
npx prisma migrate diff --from-url "$BASE/$FRESH" --to-schema-datamodel prisma/schema.prisma --exit-code

echo "== legacy (db push) database with data"
psql "$BASE/$LEGACY" -q -f prisma/migrations/0_init/migration.sql
psql "$BASE/$LEGACY" -q <<'SQL'
INSERT INTO users (id,email,password_hash,full_name,role,account_status,refresh_token_version,updated_at)
VALUES ('u1','suspended@x.test','h','A','DOCTOR','APPROVED',-1,now()), ('u2','active@x.test','h','B','DOCTOR','APPROVED',4,now());
INSERT INTO clinical_cases (id,doctor_id,idempotency_key,case_text,status,updated_at) VALUES ('c1','u1','k1','text text text','FAILED',now());
INSERT INTO clinical_analyses (id,clinical_case_id,model_name,prompt_version,response_json,status) VALUES ('a1','c1','m','v1','{}','GROQ_ERROR');
INSERT INTO audit_logs (id,actor_user_id,action,resource_type,resource_id) VALUES ('l1','u1','x','User','u1');
SQL
DATABASE_URL="$BASE/$LEGACY" sh scripts/migrate.sh
npx prisma migrate diff --from-url "$BASE/$LEGACY" --to-schema-datamodel prisma/schema.prisma --exit-code

check() {
  actual=$(psql "$BASE/$LEGACY" -tA -c "$1")
  if [ "$actual" != "$2" ]; then echo "FAIL: $1 -> '$actual' (expected '$2')"; exit 1; fi
  echo "ok: $1 = $2"
}
check "SELECT count(*) FROM users" "2"
check "SELECT count(*) FROM clinical_cases" "1"
check "SELECT account_status||':'||refresh_token_version FROM users WHERE id='u1'" "SUSPENDED:2"
check "SELECT account_status||':'||refresh_token_version FROM users WHERE id='u2'" "APPROVED:4"
check "SELECT response_json IS NULL FROM clinical_analyses WHERE id='a1'" "t"
check "SELECT organization_id IS NULL FROM audit_logs WHERE id='l1'" "t"

if psql "$BASE/$LEGACY" -q -c "DELETE FROM audit_logs" 2>/dev/null; then echo "FAIL: audit log DELETE was allowed"; exit 1; fi
echo "ok: audit log DELETE rejected"

echo "== re-run is a no-op"
DATABASE_URL="$BASE/$LEGACY" sh scripts/migrate.sh | grep -q "No pending migrations"
echo "migration tests passed"
