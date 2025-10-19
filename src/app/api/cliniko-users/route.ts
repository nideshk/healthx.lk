export async function GET() {
  try {
    const auth =
      "Basic " + Buffer.from(process.env.CLINIKO_API_KEY + ":").toString("base64");

    const response = await fetch("https://api.cliniko.com/v1/users", {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    // Check status before parsing
    if (!response.ok) {
      const text = await response.text(); // read raw error body
      console.error("Cliniko error:", response.status, text);
      return new Response(
        JSON.stringify({
          error: "Cliniko API failed",
          status: response.status,
          body: text,
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only parse JSON if body exists
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cliniko API error:", error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
