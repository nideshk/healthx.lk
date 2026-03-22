'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const fetchPromiseRef = useRef<Promise<any> | null>(null);
    const userRef = useRef(user);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const fetchMe = useCallback(async (showLoader = true) => {
        if (fetchPromiseRef.current) return fetchPromiseRef.current;

        const p = (async () => {
            // Only show loader if we don't have a user yet to prevent flicker on refresh
            if (showLoader && !userRef.current) setLoading(true);

            try {
                const { data } = await supabaseBrowser.auth.getSession();
                const session = data.session;
                const token = session?.access_token;

                if (!token) {
                    setUser(null);
                    setLoading(false);
                    return null;
                }

                const res = await fetch('/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    setUser(null);
                    setLoading(false);
                    return null;
                }

                const json = await res.json();
                setUser(json.user);
                return json.user;
            } catch (err) {
                console.error("Auth fetch failed:", err);
                return null;
            } finally {
                setLoading(false);
                fetchPromiseRef.current = null;
            }
        })();

        fetchPromiseRef.current = p;
        return p;
    }, []); // No dependencies

    useEffect(() => {
        // initial load
        fetchMe(true);

        const {
            data: { subscription },
        } = supabaseBrowser.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                // If we already have a user, do a silent refresh
                fetchMe(false);
            } else if (event === "TOKEN_REFRESHED") {
                fetchMe(false);
            }

            if (event === "SIGNED_OUT") {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchMe]);

    const contextValue = useMemo(() => ({
        user,
        loading,
        refreshUser: fetchMe
    }), [user, loading, fetchMe]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
