// src/types/dashboard.ts

export type Role = "admin" | "practitioner" | "patient";

export type ClinicianStats = {
  todaysAppointments: number;
  completedAppointments: number;
};

export type Patient = {
  id: string;
  patientId: string;
  full_name: string;
  age: number;
  email: string;
  contact_number: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  allergies?: string;
  lastConsultation?: string;
  consentGiven: boolean;
  // contact & address (for overview tab)
  addressLine1?: string;
  city?: string;
  country?: string;
  state?: string;
};

export type PatientDetailTab =
  | "overview"
  | "appointments"
  | "settings"
  | "audit";

export type AppointmentCategory = "upcoming" | "ongoing" | "previous";
export type AppointmentStatus = "confirmed" | "completed" | "cancelled";

export type AppointmentDocument = {
  url?: string;
  id: string;
  name: string;
};

export type Appointment = {
  id: string;
  category: AppointmentCategory; // "upcoming" or "previous"
  date: string; // "15/09/2025"
  time: string; // "10:00 AM"
  doctorName: string;
  reason: string; // "Annual Checkup", etc.
  status: AppointmentStatus;
  appointmentType?: string;
  telehealthConsent?: boolean;
  termsAccepted?: boolean;
  mainConcern?: string;
  goal?: string;
  durationOfConcern?: string;
  documents?: AppointmentDocument[];
  clinicianNotes?: string;
  prescriptions?: string;
  followUpNeeded?: boolean;
  followUpDate?: string;
  patient?: string;
  room_key?: string;
  email? :string;
  contact_number? : string
  patient_id? : string
};

// ---------------- Analytics ---------------- //

export type AnalyticsTabId = "bookings" | "timestamps";

export interface BookingStats {
  totalBookings: number;
  completed: number;
  cancelled: number;
  refunds: number;
  upcoming: number;
  revenue: number;
  currency: string;
}

export interface TimestampRow {
  id: string;
  patientId: string;
  scheduledTime: string;
  actualStartTime: string;
  appointmentType: string;
  duration: string;
  status: "on-time" | "late";
  lateByMinutes?: number; // only exists if status = late
}

export type SettingsTabId = "security" | "account" | "availability" | "pricing";

export interface AdminAppointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  doctorName: string;
  category: "upcoming" | "previous";
}
