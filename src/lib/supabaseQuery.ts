/**
 * Server-side Supabase clients must not keep a user session.
 *
 * The shared client otherwise takes navigator.locks around every query
 * when a session is persisted. A per-request fetch timeout turns a stuck
 * connection to the Tokyo database into an error the booking UI can retry.
 */
const QUERY_TIMEOUT_MS = 18_000;

export function supabaseQueryFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(QUERY_TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

export const supabaseQueryAuth = {
  persistSession: false as const,
  autoRefreshToken: false as const,
  detectSessionInUrl: false as const,
  lock: async <T>(
    _name: string,
    _acquireTimeout: number,
    fn: () => Promise<T>
  ): Promise<T> => fn(),
};
