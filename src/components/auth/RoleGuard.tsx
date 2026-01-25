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
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user || !allowed.includes(user.profile.role)) {
            toast.error("You are not authorized to access this page", { toastId: "unauthorized" });
            router.replace(redirectTo);
        }
    }, [user, loading, allowed, redirectTo, router]);

    if (loading) return null;

    if (!user || !allowed.includes(user.profile.role)) {
        return null;
    }

    return <>{children}</>;
}
