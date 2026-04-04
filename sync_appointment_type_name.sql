-- =====================================================
-- Sync Appointment Type Name to Practitioners
-- =====================================================
-- Run this script in your Supabase SQL Editor to enable
-- name propagation when an admin updates an appointment type.

CREATE OR REPLACE FUNCTION sync_appointment_type_name_to_practitioners(target_type_id UUID, new_name TEXT)
RETURNS void AS $$
BEGIN
  -- Updates the 'type' field inside the fees JSONB object for the specific type_id key.
  -- This ensures that existing doctors' service names reflect the admin's changes.
  UPDATE practitioners
  SET fees = jsonb_set(
    fees,
    array[target_type_id::text, 'type'],
    to_jsonb(new_name)
  )
  WHERE fees ? target_type_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
