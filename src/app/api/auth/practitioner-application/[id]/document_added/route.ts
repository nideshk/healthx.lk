import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: Request,
  context: { params: { id: string } }
) {
  const { id: applicationId } = context.params;  
  const { documents } = await req.json();

  if (!Array.isArray(documents)) {
    return NextResponse.json(
      { error: "documents must be an array" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("practitioner_applications")
    .update({ documents })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
