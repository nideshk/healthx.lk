'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const fetchRef = useRef(false);

    const fetchMe = async (showLoader = true) => {
        if (fetchRef.current) return;
        fetchRef.current = true;

        if (showLoader) setLoading(true);

        try {
            const { data } = await supabaseBrowser.auth.getSession();
            const token = data.session?.access_token;

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
            setLoading(false);
            return json.user;
        } finally {
            fetchRef.current = false;
        }
    };

    useEffect(() => {
        // initial load only
        fetchMe(true);

        const {
            data: { subscription },
        } = supabaseBrowser.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                fetchMe(true);
            } else if (event === "TOKEN_REFRESHED") {
                fetchMe(false);
            }

            if (event === "SIGNED_OUT") {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, refreshUser: fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
