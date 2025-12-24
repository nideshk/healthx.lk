import { requireUser } from "@/lib/authGuard";
import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { user } = await requireUser();
    console.log(user?.patient_id)

    /* user.patientId is trusted */
    const { data: files, error } = await supabaseClient
      .from("attachments")
      .select(
        "*"
    )
      .eq("patient_id", user?.patient_id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch files" },
        { status: 500 }
      );
    }

    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 401 }
    );
  }
}
