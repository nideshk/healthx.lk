// src/components/auth/RoleGuard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-toastify";

type Role = "admin" | "superadmin" | "practitioner" | "patient";

export function RoleGuard({
    allowed,
    children,
    redirectTo = "/dashboard",
}: {
    allowed: Role[];
    children: React.ReactNode;
    redirectTo?: string;
}) {
    const router = useRouter();
    const { user, loading, refreshUser } = useAuth();

    useEffect(() => {
        if (loading) return;

        const check = async () => {
            // If context says no user, try to double check once directly
            if (!user) {
                const refreshed = await refreshUser();
                if (refreshed && refreshed.profile && allowed.includes(refreshed.profile.role)) {
                    return;
                }
            }

            if (!user || !user.profile || !allowed.includes(user.profile.role)) {
                toast.error("You are not authorized to access this page", { toastId: "unauthorized" });
                router.replace(redirectTo);
            }
        }
        check();
    }, [user, loading, allowed, redirectTo, router, refreshUser]);

    if (loading) return null;

    if (!user || !user.profile || !allowed.includes(user.profile.role)) {
        return null;
    }

    return <>{children}</>;
}
