import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }) {
  try {
    // 🔐 Authentication check
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    const role = user?.profile?.role;

    // 🔒 Authorization check
    if (role !== "admin" && role !== "superadmin") {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied. Admin privileges required.",
        },
        { status: 403 }
      );
    }

    const { id: applicationId } = await context.params;

    if (!applicationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Application ID is required.",
        },
        { status: 400 }
      );
    }

    // ✅ Fetch single application (EXPLICIT fields, NO password)
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
        license_number,
        experience_years,
        contact_email,
        contact_number,
        profile_bio,
        available_services,
        fees,
        availability,
        bank_details,
        status,
        user_created,
        user_id,
        created_at,
        updated_at
      `)
      .eq("id", applicationId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            message: "Application not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch application.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected server error.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
