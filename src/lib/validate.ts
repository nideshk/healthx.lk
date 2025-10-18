// lib/validate.ts
import { z } from "zod";

export const appointmentSchema = z.object({
  patient_id: z.number(),
  practitioner_id: z.number(),
  appointment_type_id: z.number(),
  business_id: z.number(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  notes: z.string().optional(),
});
