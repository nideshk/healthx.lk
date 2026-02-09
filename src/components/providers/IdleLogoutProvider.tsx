"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { toast } from "react-toastify";

const IDLE_TIMEOUT = 1000 * 60 * 60 * 2; // 1 minute for testing

export default function IdleLogoutProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());

    const logout = async () => {
        // clear tokens
        localStorage.removeItem("auth_token");
        localStorage.removeItem("telehealth_token");
        await supabaseBrowser.auth.signOut();
        router.push("/");
    };

    const resetTimer = () => {
        const now = Date.now();
        startTimeRef.current = now;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            toast.error("No Activity detected, Logging out...")
            logout();
        }, IDLE_TIMEOUT);
    };

    useEffect(() => {

        const events = [
            "mousemove",
            "mousedown",
            "keydown",
            "scroll",
            "touchstart",
        ];

        const handleActivity = () => resetTimer();

        events.forEach((event) =>
            window.addEventListener(event, handleActivity)
        );

        // start timer
        resetTimer();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            events.forEach((event) =>
                window.removeEventListener(event, handleActivity)
            );
        };
    }, []);

    return <>{children}</>;
}
