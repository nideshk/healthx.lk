export const fetchDraft = async () => {
  const res = await fetch("http://localhost:3000/api/appointment/draft", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // ✅ crucial: sends Supabase session cookies
  });

  if (!res.ok) throw new Error("Failed to fetch drafts");
  return await res.json();
};
