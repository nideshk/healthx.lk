"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";

function ProfilePageUI() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const res = await authFetch("/api/auth/me");
            const json = await res.json();
            setData(json);
        };

        load();
    }, []);

    return (
        <div>
            <h1>Profile</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}

export default ProfilePageUI;
