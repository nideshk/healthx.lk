// src/lib/authFetch.ts
import { supabaseBrowser } from "@/lib/supabaseBrowser";

let cachedAccessToken: string | null = null;
let refreshingPromise: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
    // If we already have a token, reuse it
    if (cachedAccessToken) {
        return cachedAccessToken;
    }

    // If a refresh is already in progress, wait for it
    if (refreshingPromise) {
        return refreshingPromise;
    }

    // Otherwise, start a single refresh
    refreshingPromise = (async () => {
        const { data, error } = await supabaseBrowser.auth.getSession();

        if (error || !data.session?.access_token) {
            cachedAccessToken = null;
            refreshingPromise = null;
            throw new Error("Not authenticated");
        }

        cachedAccessToken = data.session.access_token;

        // Clear lock after a short delay
        setTimeout(() => {
            cachedAccessToken = null;
        }, 30_000); // 30s cache (safe)

        refreshingPromise = null;
        return cachedAccessToken;
    })();

    return refreshingPromise;
}

export async function authFetch(
    input: RequestInfo | URL,
    init: RequestInit = {}
): Promise<Response> {
    const token = await getAccessToken();

    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(input, {
        ...init,
        headers,
    });
}
