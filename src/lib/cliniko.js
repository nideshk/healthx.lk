// lib/cliniko.js

export async function clinikoFetch(endpoint, options = {}) {
  const apiKey = process.env.CLINIKO_API_KEY;
  const region = process.env.CLINIKO_REGION || "au1";
  const userAgent = `${process.env.CLINIKO_APP_NAME} (${process.env.CLINIKO_APP_EMAIL})`;

  const auth = "Basic " + Buffer.from(apiKey + ":").toString("base64");

  const res = await fetch(`https://api.${region}.cliniko.com/v1/${endpoint}`, {
    headers: {
      Authorization: auth,
      Accept: "application/json",
      "User-Agent": userAgent,
      ...options.headers,
    },
    cache: "no-store",
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Cliniko API error:", res.status, text);
    throw new Error(`Cliniko API error (${res.status}): ${text}`);
  }

  return res.json();
}
