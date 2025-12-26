import { supabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";



/* ------------------------------
   Helpers
-------------------------------- */

/** Extract {{variable.path}} from HTML */
function extractVariables(html: string): string[] {
  const matches = html.match(/{{(.*?)}}/g) || [];
  return matches.map((v) => v.replace(/[{}]/g, "").trim());
}

/** Basic HTML safety check */
function containsUnsafeHtml(html: string): boolean {
  const forbidden = /<script|<iframe|<object|<embed/gi;
  return forbidden.test(html);
}

/* ------------------------------
   GET: Fetch all templates
-------------------------------- */
export async function GET() {
  const { data, error } = await supabaseClient
    .from("email_templates")
    .select(
      `
        id,
        name,
        description,
        html,
        allowed_variables,
        required_variables,
        updated_at
      `
    )
    .order("id");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

/* ------------------------------
   POST: Update a template
-------------------------------- */
export async function POST(req: Request) {
  try {
    const { templateId, html } = await req.json();

    if (!templateId || !html) {
      return NextResponse.json(
        { error: "templateId and html are required" },
        { status: 400 }
      );
    }

    /* 1️⃣ Fetch template contract */
    const { data: template, error: fetchError } =
      await supabaseClient
        .from("email_templates")
        .select(
          "allowed_variables, required_variables"
        )
        .eq("id", templateId)
        .single();

    if (fetchError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const usedVariables = extractVariables(html);

    /* 2️⃣ Validate required variables */
    const missingRequired =
      template.required_variables.filter(
        (v: string) => !usedVariables.includes(v)
      );

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required variables",
          details: missingRequired,
        },
        { status: 400 }
      );
    }

    /* 3️⃣ Validate allowed variables */
    const invalidVariables = usedVariables.filter(
      (v) => !template.allowed_variables.includes(v)
    );

    if (invalidVariables.length > 0) {
      return NextResponse.json(
        {
          error: "Invalid variables used",
          details: invalidVariables,
        },
        { status: 400 }
      );
    }

    /* 4️⃣ Basic HTML safety */
    if (containsUnsafeHtml(html)) {
      return NextResponse.json(
        {
          error:
            "HTML contains forbidden tags (script, iframe, etc.)",
        },
        { status: 400 }
      );
    }

    /* 5️⃣ Save template */
    const { error: updateError } = await supabaseClient
      .from("email_templates")
      .update({ html })
      .eq("id", templateId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid request" },
      { status: 500 }
    );
  }
}
