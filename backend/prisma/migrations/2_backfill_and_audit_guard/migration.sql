-- 1. Suspension previously encoded as refresh_token_version = -1 (which did not block login).
--    Convert to an explicit status and move the session generation forward so that no
--    token issued before suspension can become valid again on reactivation.
UPDATE "users"
SET "account_status" = 'SUSPENDED', "refresh_token_version" = 2
WHERE "refresh_token_version" < 0;

-- 2. Failed analyses were stored with an empty object as their result. A failure has no result.
UPDATE "clinical_analyses"
SET "response_json" = NULL
WHERE "status" <> 'SUCCESS' AND "response_json" = '{}'::jsonb;

-- 3. Attribute historical audit events to the actor's organization for tenant-scoped reads.
UPDATE "audit_logs" a
SET "organization_id" = u."organization_id"
FROM "users" u
WHERE a."actor_user_id" = u."id" AND a."organization_id" IS NULL;

-- 4. Append-only audit trail: reject UPDATE and DELETE for every database role that
--    goes through normal DML. (TRUNCATE by the table owner is still possible; restrict
--    the application role's privileges if that must also be prevented.)
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% rejected)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
