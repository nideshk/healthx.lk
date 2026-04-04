-- =====================================================
-- Full Metadata Sync to Practitioners
-- =====================================================
-- Run this script in your Supabase SQL Editor to replace
-- the previous function with support for multiple metadata fields.

CREATE OR REPLACE FUNCTION sync_appointment_type_metadata_to_practitioners(
  target_type_id UUID,
  new_name TEXT DEFAULT NULL,
  new_platform_fee NUMERIC DEFAULT NULL,
  new_max_attendee INT DEFAULT NULL,
  new_duration_mins INT DEFAULT NULL,
  new_extra_fee NUMERIC DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Merges the new metadata into the existing JSONB entry in the practitioners.fees column.
  -- jsonb_set is used to target the type_id key, and the || operator merges the nested objects.
  -- jsonb_strip_nulls ensures we only update fields that were actually provided.
  UPDATE practitioners
  SET fees = jsonb_set(
    fees,
    array[target_type_id::text],
    (fees->target_type_id::text) || jsonb_strip_nulls(jsonb_build_object(
      'type', new_name,
      'platform_fee', new_platform_fee,
      'max_attendee', new_max_attendee,
      'duration_mins', new_duration_mins,
      'extra_fee_per_attendee', new_extra_fee
    ))
  )
  WHERE fees ? target_type_id::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
