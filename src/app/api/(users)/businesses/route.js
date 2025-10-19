import { clinikoFetch } from "@/lib/cliniko";
import { requireUser } from "@/lib/authGuard";

export async function GET(req) {
  try {
    const { authorized, response } = await requireUser();
    if (!authorized) return response;

    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "10";
    const sort = searchParams.get("sort") || "created_at:desc";
    const order = searchParams.get("order") || "asc";

    const endpoint = `businesses?page=${page}&per_page=${per_page}&sort=${sort}&order=${order}`;

    const data = await clinikoFetch(endpoint);

    return Response.json(data, { status: 200 });
  } catch (error) {
    console.error("Cliniko /businesses error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
