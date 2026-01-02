import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

export async function GET() {
  try {
    // 🔐 Authentication check
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    const role = user?.profile?.role;

    // 🔒 Authorization check
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Fetch applications (NO encrypted_password)
    const { data, error } = await supabaseAdmin
      .from("practitioner_applications")
      .select(`
        id,
        email,
        first_name,
        last_name,
        state,
        city,
        qualification,
        specialization,
        experience_years,
        status,
        user_created,
        user_id,
        created_at
      `)
      .eq("user_created", false)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
