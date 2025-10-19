import { requireUser } from "@/lib/authGuard";
import { clinikoFetch } from "@/lib/cliniko";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";



export async function GET(req, context) {
  const { authorized, response, user } = await requireUser();
  if (!authorized) return response;
  
  try {
    const { id } = await context.params; // no need for await
    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    // ✅ Step 1: Fetch appointment from Cliniko
    const appointment = await clinikoFetch(`individual_appointments/${id}`);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }

    // ✅ Step 2: Extract patient ID from appointment
    const patientUrl = appointment.patient?.links?.self;
    const patientIdFromCliniko = patientUrl?.split("/")?.pop();

    console.log("Extracted patient ID from Cliniko:", patientIdFromCliniko);
    console.log("Authenticated user:", user);
    console.log("Fetched appointment:", appointment);

    const isAdmin = user?.role === "admin";
    const isOwner =
      user?.cliniko_patient_id?.toString() === patientIdFromCliniko?.toString();

      

      if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: appointment does not belong to you.",  },
        { status: 403 }
      );
    }

    console.log("User is authorized to access this appointment.", appointment);
    // ✅ Step 4: Return appointment data (simplified)
    return NextResponse.json({
      appointment: {
        id: appointment.id,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        patient_name: appointment.patient_name,
        telehealth_url: appointment.telehealth_url,
        notes: appointment.notes,
        practitioner: appointment.practitioner?.links?.self,
        business: appointment.business?.links?.self,
        status: appointment.cancelled_at ? "cancelled" : "confirmed",
      },
      requested_by: user.email,
    });
  } catch (error) {
    console.error("Cliniko fetch appointment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
