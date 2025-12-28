import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getEmailTemplate(templateName: string) {
    console.log(`Fetching email template: ${templateName}`);
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("name", templateName)
    .single();

  if (error || !data) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  return data;
}

export function renderTemplate(
  html: string,
  data: Record<string, any>
) {
  return html.replace(/{{(.*?)}}/g, (_, key) => {
    return (
      key
        .split(".")
        .reduce((obj:any, k:any) => obj?.[k], data) ?? ""
    );
  });
}
