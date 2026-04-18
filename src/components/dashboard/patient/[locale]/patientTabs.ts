// patientTabs.ts
export type PatientTab =
  | "appointment"
  | "reschedule"
  | "prescriptions"
  | "file-manager"
  | "follow-up";

export const DEFAULT_PATIENT_TAB: PatientTab = "appointment";
