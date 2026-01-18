import { getSafeAccessToken } from './auth-lock';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

/**
 * A wrapper around fetch that automatically injects the Bearer token.
 * Uses the concurrency-safe getSafeAccessToken() to prevent race conditions.
 */
export const authenticatedFetch = async (url: string, options: RequestOptions = {}) => {
    const token = await getSafeAccessToken();

    if (!token) {
        // Handle unauthenticated state - arguably throw or redirect.
        // Throwing allows the caller to catch and redirect.
        throw new Error('User is not authenticated');
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    return response;
};
