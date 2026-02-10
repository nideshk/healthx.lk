'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = async (showLoader = false) => {
        if (showLoader) setLoading(true);

        const { data } = await supabaseBrowser.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        const res = await fetch('/api/auth/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            setUser(null);
            setLoading(false);
            return;
        }

        const json = await res.json();
        setUser(json.user);
        setLoading(false);
    };

    useEffect(() => {
        // initial load only
        fetchMe(true);

        const {
            data: { subscription },
        } = supabaseBrowser.auth.onAuthStateChange((event) => {
            // do NOT trigger loading state on refresh
            if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
                fetchMe(false);
            }

            if (event === "SIGNED_OUT") {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
