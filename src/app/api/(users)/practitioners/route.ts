import { NextRequest, NextResponse } from "next/server";

import { supabaseClient } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/authGuard";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic";

const PRACTITIONER_LIST_COLUMNS = `
  id,
  full_name,
  specialization,
  qualification,
  license_number,
  experience_years,
  profile_bio,
  profile_picture_url,
  available_services
`;

const WRITABLE_FIELDS = [
  "full_name",
  "first_name",
  "last_name",
  "qualification",
  "specialization",
  "license_number",
  "experience_years",
  "contact_email",
  "contact_number",
  "profile_bio",
  "available_services",
  "profile_picture_url",
  "languages",
  "gender",
  "fees",
] as const;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length === value.length ? items : undefined;
}

function whitelistPractitioner(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};

  for (const field of WRITABLE_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];

    if (
      field === "full_name" ||
      field === "first_name" ||
      field === "last_name" ||
      field === "qualification" ||
      field === "license_number" ||
      field === "contact_email" ||
      field === "contact_number" ||
      field === "profile_bio" ||
      field === "profile_picture_url" ||
      field === "gender"
    ) {
      if (typeof value === "string") payload[field] = value.trim();
      continue;
    }

    if (field === "experience_years") {
      const years = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(years)) payload[field] = years;
      continue;
    }

    if (field === "specialization") {
      if (typeof value === "string" && value.trim()) {
        payload[field] = [value.trim()];
      } else {
        const list = asStringArray(value);
        if (list) payload[field] = list;
      }
      continue;
    }

    if (field === "available_services" || field === "languages") {
      const list = asStringArray(value);
      if (list) payload[field] = list;
      continue;
    }

    if (
      field === "fees" &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      payload[field] = value;
    }
  }

  return payload;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.authorized || !auth.user) return auth.response;

    if (auth.user.role !== "admin" && auth.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const payload = whitelistPractitioner(body as Record<string, unknown>);
    const fullName = asTrimmedString(payload.full_name);
    const contactEmail = asTrimmedString(payload.contact_email);

    if (!fullName || !contactEmail) {
      return NextResponse.json(
        { error: "Missing required fields: full_name or contact_email" },
        { status: 400 }
      );
    }

    payload.full_name = fullName;
    payload.contact_email = contactEmail;

    const { data, error } = await supabaseAdmin
      .from("practitioners")
      .insert(payload)
      .select("id, full_name, contact_email")
      .single();

    if (error || !data) {
      console.error("Practitioner insert failed");
      return NextResponse.json(
        { error: "Failed to add practitioner" },
        { status: 500 }
      );
    }

    const cnx = getAuditContext(req, auth.user);

    await auditLog({
      ...cnx,
      action: "CREATED",
      entityType: "PRACTITIONER",
      purpose: "operations",
      source: "dashboard",
      metadata: { message: "Practitioner created successfully", id: data.id },
    });

    return NextResponse.json(
      { message: "Practitioner created successfully", data },
      { status: 201 }
    );
  } catch {
    console.error("Practitioner create failed");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get("offset") ?? 0) || 0, 0);

    let query = supabaseClient
      .from("practitioners")
      .select(PRACTITIONER_LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike("full_name", `%${q}%`);
    } else if (specialization) {
      query = query.contains("specialization", [specialization]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Practitioner list failed");
      return NextResponse.json(
        { error: "Failed to fetch practitioners" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: "No practitioners found", data: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: "Practitioners retrieved successfully",
        count: data.length,
        data,
      },
      { status: 200 }
    );
  } catch {
    console.error("Practitioner list crashed");
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
