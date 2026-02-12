// lib/createAppointment.ts
import { AppointmentFormInputs } from "@/types/FormType";
import axios from "axios";

export async function createAppointment(bookingData: any) {
  if (
    !bookingData.selectedDoctor ||
    !bookingData.appointmentDate ||
    !bookingData.appointmentTimeSlot
  ) {
    throw new Error("Missing required booking data");
  }

  try {
    // ✅ 1. Fetch practitioner details
    const practitionerRes = await axios.get(
      `/api/practitioner/${bookingData.selectedDoctor.registration}`
    );
    const practitionerData = practitionerRes.data;

    // ✅ 2. Prepare payload directly
    const date = new Date(bookingData.appointmentDate);
    const [hourStr, minuteStr] = bookingData.appointmentTimeSlot.split(":");
    const hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);

    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    const payload = {
      appointment_type_id: bookingData.selectedServiceId,
      business_id: practitionerData.business.id,
      patient_id: practitionerData.userData.cliniko_patient_id,
      practitioner_id: bookingData.selectedDoctor.registration,
      starts_at: startTime.toISOString(),
      ends_at: endTime.toISOString(),
      notes: "Created from Clinecxa Portal",
      patient_case_id: null,
      repeat_rule: null,
    };


    // ✅ 3. Create appointment
    const response = await axios.post("/api/appointments", payload);

    return response.data;
  } catch (error: any) {
    console.error("❌ Appointment creation failed:", error);
    throw error;
  }
}
