import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET: Fetch all platform settings (Public)
 */
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value, description")
      .order("key", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * PUT: Update platform settings (Admin Only)
 */
export async function PUT(req: NextRequest) {
  try {
    const { authorized, role } = await requireUser(req);

    if (!authorized || (role !== "admin" && role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { updates } = await req.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates format. Expected an array of {key, value}." }, { status: 400 });
    }

    const results = [];
    for (const item of updates) {
      const { key, value } = item;
      
      if (!key) continue;

      const { data, error } = await supabaseAdmin
        .from("platform_settings")
        .update({ 
          value, 
          updated_at: new Date().toISOString() 
        })
        .eq("key", key)
        .select()
        .single();

      if (error) {
        console.error(`Error updating setting ${key}:`, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      
      results.push(data);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
