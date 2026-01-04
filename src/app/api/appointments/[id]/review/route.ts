import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";
import { getAuditContext } from "@/lib/audit/getAuditContext";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }>  }
) {
  try {
    /* ---------------- AUTH ---------------- */
    const { authorized, user } = await requireUser();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {id} = await context.params;
    const patientId = user?.patient_id;
    if (!patientId) {
      return NextResponse.json(
        { error: "No patient profile found" },
        { status: 400 }
      );
    }

    /* ---------------- INPUT ---------------- */
    const { rating, comment } = await req.json();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    /* ---------------- LOAD APPOINTMENT ---------------- */
    const { data: appointment, error: apptError } = await supabaseClient
      .from("appointments")
      .select("id, patient_id, practitioner_id, status")
      .eq("id", id)
      .single();

    if (apptError || !appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    if (appointment.patient_id !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (appointment.status !== "completed") {
      return NextResponse.json(
        { error: "Review allowed only after appointment completion" },
        { status: 400 }
      );
    }

    /* ---------------- CHECK DUPLICATE ---------------- */
    const { data: existing } = await supabaseClient
      .from("appointment_reviews")
      .select("id")
      .eq("appointment_id", appointment.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Review already submitted" },
        { status: 409 }
      );
    }

    /* ---------------- INSERT REVIEW ---------------- */
    const { data: review, error: insertError } = await supabaseClient
      .from("appointment_reviews")
      .insert({
        appointment_id: appointment.id,
        practitioner_id: appointment.practitioner_id,
        patient_id: patientId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();

    if (insertError || !review) {
      return NextResponse.json(
        { error: "Failed to submit review" },
        { status: 500 }
      );
    }

    /* ---------------- UPDATE PRACTITIONER RATING ---------------- */
    const { data: practitioner } = await supabaseClient
      .from("practitioners")
      .select("avg_rating, total_reviews")
      .eq("id", appointment.practitioner_id)
      .single();

    const oldAvg = practitioner?.avg_rating ?? 0;
    const oldCount = practitioner?.total_reviews ?? 0;

    const newCount = oldCount + 1;
    const newAvg = (oldAvg * oldCount + rating) / newCount;

    await supabaseClient
      .from("practitioners")
      .update({
        avg_rating: Number(newAvg.toFixed(2)),
        total_reviews: newCount,
      })
      .eq("id", appointment.practitioner_id);

    /* ---------------- MARK APPOINTMENT REVIEWED ---------------- */
    await supabaseClient
      .from("appointments")
      .update({ reviewed_at: new Date().toISOString() })
      .eq("id", appointment.id);

    /* ---------------- AUDIT ---------------- */
    const auditContext = getAuditContext(req, user);

    await auditLog({
      ...auditContext,
      action: "CREATED",
      entityType: "APPOINTMENT_REVIEW",
      entityId: review.id,
      purpose: "operations",
      source: "dashboard",
    });

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
      },
    });
  } catch (err) {
    console.error("Submit review error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
