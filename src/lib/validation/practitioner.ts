import { z } from "zod";

export const practitionerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character"
    ),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  languages: z.string().min(1, "Please specify at least one language"),
  qualification: z.string().min(1, "Qualification is required"),
  specialization: z.array(z.string()).min(1, "Please select at least one specialization"),
  license_number: z.string().min(1, "License number is required"),
  experience_years: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Experience must be a positive number",
  }),
  contact_number: z
    .string()
    .min(10, "Contact number must be at least 10 digits")
    .regex(/^\+?[0-9]+$/, "Contact number must contain only digits and optional '+'"),
  profile_bio: z.string().min(20, "Bio must be at least 20 characters").max(1000, "Bio too long"),
  bank_details: z.object({
    bank_name: z.string().min(1, "Bank name is required"),
    account_name: z.string().min(1, "Account name is required"),
    branch_location: z.string().min(1, "Branch location is required"),
    account_number: z.string().min(1, "Account number is required"),
  }),
});

export type PractitionerFormValues = z.infer<typeof practitionerSchema>;

// This schema represents the data after it has been processed for the API
export const practitionerApiSchema = practitionerSchema.extend({
  languages: z.array(z.string()).min(1, "At least one language is required"),
  experience_years: z.number().min(0),
  available_services: z.array(z.string()).min(1),
  contact_email: z.string().email().optional(),
  fees: z.record(z.string(), z.object({
    type: z.string(),
    fee: z.number()
  }))
});

export type PractitionerApiPayload = z.infer<typeof practitionerApiSchema>;
