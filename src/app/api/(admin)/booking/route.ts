import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const STATUS_MAP: Record<string, string[]> = {
  total: ["scheduled", "confirmed", "completed", "cancelled", "pending"],
  upcoming: ["scheduled", "confirmed", "pending"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export async function GET(req: Request) {
  try {
    const { authorized, response, user } = await requireUser();
    if (!authorized) return response;

    /** RBAC */
    if (!user?.admin || !["admin", "superadmin"].includes(user.admin.role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const type = searchParams.get("type");

    if (!fromDate || !toDate || !type) {
      return NextResponse.json(
        {
          success: false,
          message: "`from`, `to`, and `type` are required",
        },
        { status: 400 }
      );
    }

    const statuses = STATUS_MAP[type];
    if (!statuses) {
      return NextResponse.json(
        { success: false, message: "Invalid type filter" },
        { status: 400 }
      );
    }

    const perPage = Math.min(Number(searchParams.get("per_page")) || 20, 100);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    let query = supabaseAdmin
  .from("appointments")
  .select(
    `
    id,
    starts_at,
    ends_at,
    appointment_type_id,
    cancellation_reason,
    payment_status,
    status,
    notes,
    patient:patient_id(full_name, email),
    practitioner:practitioner_id(full_name, contact_email),
    appointment_type:appointment_type!fk_appointments_type (
      name
    )
    `,
    { count: "exact" }
  )
  .gte("starts_at", `${fromDate}T00:00:00`)
  .lte("starts_at", `${toDate}T23:59:59`)
  .in("status", statuses)
  .range(from, to);


    const { data, error, count } = await query;
    if (!count || from >= count) {
      return NextResponse.json({
        success: true,
        meta: {
          total: count ?? 0,
          page,
          per_page: perPage,
          total_pages: count ? Math.ceil(count / perPage) : 0,
        },
        data: [],
      });
    }

    if (error) {
      console.error("DB Error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch appointments",
        },
        { status: 500 }
      );
    }

    const formatted = (data).map((a: any) => {
      const start = new Date(a.starts_at);
      const end = a.ends_at ? new Date(a.ends_at) : null;

      return {
        id: a.id,

        appointment_date: start.toISOString().split("T")[0],

        start_time: start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),

        end_time: end
          ? end.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : null,

        status: a.status,
        payment_status: a.payment_status ?? "unpaid",

        patient: a.patient
          ? {
              name: a.patient.full_name,
              email: a.patient.email,
            }
          : null,

        practitioner: a.practitioner
          ? {
              name: a.practitioner.full_name,
              email: a.practitioner.contact_email,
            }
          : null,

        appointment_type: a.appointment_type?.name ?? null,
        cancellation_reason: a.cancellation_reason ?? null,
        notes: a.notes ?? null,
      };
    });


    return NextResponse.json({
      success: true,
      meta: {
        total: count ?? 0,
        page,
        per_page: perPage,
        total_pages: count ? Math.ceil(count / perPage) : 0,
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("❌ Appointments Fetch Error:", error);
    return NextResponse.json(
      { success: false,message:
        typeof error?.message === "string"
          ? error.message
          : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1️⃣ Auth check
    const {user} = await requireUser();
    console.log("User creating appointment:", user);
    // const isAdmin = user?.role === "admin" || user?.role === "super_admin";

    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }

    // 2️⃣ Parse body
    const {
      patient_id,
      practitioner_id,
      appointment_type_id,
      starts_at,
      ends_at,
      fee,
      currency,
    } = await req.json();

    if (
      !patient_id ||
      !practitioner_id ||
      !appointment_type_id ||
      !starts_at ||
      !ends_at
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3️⃣ Expiry = 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 4️⃣ Insert appointment
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        patient_id,
        practitioner_id,
        appointment_type_id,
        starts_at,
        ends_at,
        status: "pending",
        payment_status: "pending",
        expires_at: expiresAt.toISOString(),
        fee_charged: fee,
        currency: currency || "INR",
        source: "admin",
        created_by_admin_id: user?.admin?.id || user?.auth_user_id, // 🔥 THIS LINE
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to create appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: data,
      status: 201,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
