// patientTabs.ts
export type PatientTab =
  | "appointment"
  | "reschedule"
  | "file-manager";

export const DEFAULT_PATIENT_TAB: PatientTab = "appointment";
