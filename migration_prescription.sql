-- =====================================================
-- E-PRESCRIPTION SCHEMA MIGRATION
-- =====================================================

-- 1️⃣ Create Enums for Prescription flow
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prescription_status') THEN
        CREATE TYPE prescription_status AS ENUM ('draft', 'issued');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medicine_route') THEN
        CREATE TYPE medicine_route AS ENUM ('Oral', 'IV', 'Local', 'Suppository', 'Other');
    END IF;
END $$;

-- 2️⃣ Update practitioners with signature_url
ALTER TABLE practitioners 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 3️⃣ Create prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id),
    appointment_id UUID REFERENCES appointments(id), -- Optional: for easier linking
    encounter_id UUID NOT NULL REFERENCES encounters(id),
    diagnosis TEXT,
    special_notes TEXT,
    status prescription_status DEFAULT 'draft',
    pdf_url TEXT,
    issued_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4️⃣ Create prescription_items table
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    strength TEXT NOT NULL,
    route medicine_route NOT NULL,
    duration TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5️⃣ Update encounters to link to prescription
ALTER TABLE encounters 
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id),
ADD COLUMN IF NOT EXISTS diagnosis TEXT; -- Context: Encounters should store the diagnosis which is reused in prescription

-- 6️⃣ (Optional) Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescription_items_updated_at
    BEFORE UPDATE ON prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
