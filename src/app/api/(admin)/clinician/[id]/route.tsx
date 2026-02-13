import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import { getAuditContext } from "@/lib/audit/getAuditContext";
import { requireUser } from "@/lib/authGuard";
import { auditLog } from "@/lib/audit/auditLog";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { authorized, user } = await requireUser(req);
    const cnx = getAuditContext(req, user);
    if (!authorized) {

      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "PRACTITIONER",
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "Unauthorized access attempt - practitioner fetch"
        }
      });

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!id) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "PRACTITIONER",
        entityId: id,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "Database fetch failed"
        }
      });
      return NextResponse.json(
        { error: "Missing practitioner ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get("specialization");

    let query = supabaseClient
      .from("practitioners")
      .select("*")
      .eq("id", id)
      .limit(1)
      .order("created_at", { ascending: false });

    if (specialization) {
      query = query.ilike("specialization", `%${specialization}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch practitioner", details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      await auditLog({
        ...cnx,
        action: "FAILED",
        entityType: "PRACTITIONER",
        entityId: id,
        purpose: "operations",
        source: "dashboard",
        metadata: {
          reason: "Practitioner not found"
        }
      });
      return NextResponse.json(
        { message: "Practitioner not found", data: [] },
        { status: 404 }
      );
    }

    await auditLog(
      {
        ...cnx,
        action: "VIEWED",
        entityType: "PRACTITIONER",
        purpose: "operations",
        entityId: data[0].id,
        source: "dashboard",
        metadata: {
          practitioner_viewed: data[0]
        }
      }
    );

    return NextResponse.json(
      {
        message: "Practitioner retrieved successfully",
        data: data[0],
      },
      { status: 200 }
    );
  } catch (err: any) {
    const cnx = getAuditContext(req);
    await auditLog({
      ...cnx,
      action: "FAILED",
      entityType: "PRACTITIONER",
      purpose: "operations",
      source: "dashboard",
      metadata: {
        reason: err?.message ?? "Unexpected server error"
      }
    });

    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}
