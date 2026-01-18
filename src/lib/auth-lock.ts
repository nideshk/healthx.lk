import { supabaseBrowser } from './supabaseBrowser';

/**
 * START: Singleton Refresh Lock
 * This promise acts as a mutex/lock for token acquisition.
 * If multiple requests try to get a token simultaneously, and a refresh is needed,
 * they will all await this single promise.
 */
let accessTokenPromise: Promise<string | null> | null = null;

/**
 * Retrieves the current access token safely, preventing race conditions.
 * 
 * Mechanism:
 * 1. Checks if a token fetch/refresh is already in progress (the lock).
 * 2. If yes, awaits the existing promise (Request Coalescing).
 * 3. If no, starts a new getSession() call and locks execution.
 * 4. Supabase's getSession() automatically handles expiration and refreshing.
 * 5. By serializing this call, we ensure only ONE refresh request is sent to the API,
 *    preventing "Invalid refresh token: Already used" errors.
 */
export const getSafeAccessToken = async (): Promise<string | null> => {
    // 1. If a request is already fetching the token (possibly refreshing), join the queue.
    if (accessTokenPromise) {
        return accessTokenPromise;
    }

    // 2. Start a new request and lock the door behind us.
    accessTokenPromise = (async () => {
        try {
            // supabase.auth.getSession() handles the logic:
            // - Check memory/local storage
            // - If expired, call /refresh endpoint (auto-refresh)
            // By wrapping this in a singleton promise, we ensure only ONE refresh network call
            // happens even if 10 API requests initiate this simultaneously.
            const { data, error } = await supabaseBrowser.auth.getSession();

            if (error) {
                // Optional: Add logging or specific error handling here
                console.error('Core Auth Error:', error.message);
                throw error;
            }

            return data.session?.access_token ?? null;
        } catch (error) {
            // If getting the session fails, return null. 
            // Logic downstream (in the API client) acts on the null token.
            return null;
        } finally {
            // 3. Always unlock the door when finished (success or failure).
            // This allows new requests to start a fresh check in the future.
            accessTokenPromise = null;
        }
    })();

    return accessTokenPromise;
};
