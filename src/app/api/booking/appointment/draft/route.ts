import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const { user } = await requireUser();
  if (!user?.patient_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const incoming = body?.data;

  // 🔒 Validate payload
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return NextResponse.json(
      { error: "Invalid draft payload" },
      { status: 400 }
    );
  }

  // 🔥 HARD GUARD: never allow nested `data`
  if ("data" in incoming) {
    delete incoming.data;
  }

  // Fetch existing draft (if any)
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("appointment_draft")
    .select("id, data, status")
    .eq("patient_id", user.patient_id)
    .single();

  // If exists but locked → return as-is
  if (existing && existing.status !== "DRAFT") {
    return NextResponse.json(existing);
  }

  // ✅ Correct JSON merge (JSON → JSON only)
  const mergedData = {
    ...(existing?.data ?? {}),
    ...incoming,
  };

  // ✅ UPSERT (safe with unique(patient_id))
  const { data: saved, error } = await supabaseAdmin
    .from("appointment_draft")
    .upsert(
      {
        patient_id: user.patient_id,
        data: mergedData,
        status: "DRAFT",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Draft save failed:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }

  return NextResponse.json(saved);
}
