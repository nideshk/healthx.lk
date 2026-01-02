-- =====================================================
-- HIPAA AUDIT LOG CHECKSUM (SAFE BASELINE)
-- =====================================================

-- 1️⃣ Ensure pgcrypto is available (required for SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2️⃣ Add checksum column (nullable for safety)
ALTER TABLE hipaa_audit_log
ADD COLUMN IF NOT EXISTS checksum text;

-- 3️⃣ Drop existing checksum trigger/function if any
DROP TRIGGER IF EXISTS hipaa_audit_checksum_trigger
ON hipaa_audit_log;

DROP FUNCTION IF EXISTS generate_audit_checksum();

-- 4️⃣ Create checksum generator function
CREATE OR REPLACE FUNCTION generate_audit_checksum()
RETURNS trigger AS $$
BEGIN
  NEW.checksum :=
    encode(
      digest(
        concat_ws(
          '|',
          COALESCE(NEW.actor_user_id, ''),
          COALESCE(NEW.actor_role, ''),
          COALESCE(NEW.action, ''),
          COALESCE(NEW.entity_type, ''),
          COALESCE(NEW.entity_id, ''),
          COALESCE(NEW.purpose, ''),
          COALESCE(NEW.source, ''),
          COALESCE(NEW.created_at::text, '')
        ),
        'sha256'
      ),
      'hex'
    );

  RETURN NEW; -- 🚨 REQUIRED
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ Attach trigger (INSERT ONLY)
CREATE TRIGGER hipaa_audit_checksum_trigger
BEFORE INSERT ON hipaa_audit_log
FOR EACH ROW
EXECUTE FUNCTION generate_audit_checksum();


-- =====================================================
-- CLEAN RESET + SAFE IMMUTABILITY (ONE SCRIPT)
-- =====================================================

-- 1️⃣ Drop ALL non-internal triggers on hipaa_audit_log
DO $$
DECLARE
  trg RECORD;
BEGIN
  FOR trg IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'hipaa_audit_log'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON hipaa_audit_log;',
      trg.tgname
    );
  END LOOP;
END $$;

-- 2️⃣ Drop the immutability function safely
DROP FUNCTION IF EXISTS prevent_hipaa_audit_mutation();

-- 3️⃣ Recreate immutability function (INSERT allowed)
CREATE OR REPLACE FUNCTION prevent_hipaa_audit_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'HIPAA audit logs are immutable';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ Attach trigger ONLY for UPDATE & DELETE
CREATE TRIGGER prevent_hipaa_audit_mutation_trigger
BEFORE UPDATE OR DELETE ON hipaa_audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_hipaa_audit_mutation();
