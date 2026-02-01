"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoCallContainer from "@/components/atom/VideoCall/VideoCall";
import { authFetch } from "@/lib/authFetch";

type AuthorizeResponse = {
  authorized: true;
  role: "patient" | "practitioner" | "attendee";
  appointmentId: string;
  roomKey: string;
  token: string; // APP AUTH TOKEN (NOT IVS)
  error?: string | null;
};

export default function MeetingPage() {
  const params = useSearchParams();
  const roomKey = params.get("room");
  const inviteToken = params.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ivsToken, setIvsToken] = useState<string | null>(null);
  const [authData, setAuthData] = useState<AuthorizeResponse | null>(null);

  useEffect(() => {
    async function init() {
      try {
        /* -------- STEP 1: AUTHORIZE -------- */
        const body = inviteToken
          ? { token: inviteToken }
          : roomKey
            ? { roomKey }
            : null;

        if (!body) {
          setError("Missing meeting information");
          return;
        }

        const authRes = await authFetch("/api/telehealth/authorize", {
          method: "POST",
          body: JSON.stringify(body),
        });

        const authJson = (await authRes.json()) as AuthorizeResponse;

        if (!authRes.ok || !authJson.authorized) {
          setError(authJson.error ?? "Authorization failed");
          return;
        }

        setAuthData(authJson);
        localStorage.setItem("telehealth_token", authJson.token);

        /* -------- STEP 2: FETCH IVS TOKEN -------- */
        const ivsRes = await authFetch("/api/ivs/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: authJson.appointmentId,
            role: authJson.role,
          }),
        });

        const ivsJson = await ivsRes.json();

        // ✅ THIS MUST BE THE IVS PARTICIPANT TOKEN
        setIvsToken(ivsJson.token.token);
      } catch (e) {
        console.error(e);
        setError("Failed to prepare video call");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [roomKey, inviteToken]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Preparing your consultation…
      </div>
    );
  }

  if (!ivsToken || !authData) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        {error ?? "You are not allowed to join this consultation"}
      </div>
    );
  }

  return (
    <VideoCallContainer
      appointmentId={authData.appointmentId}
      role={authData.role}
      token={ivsToken}   // ✅ IVS TOKEN ONLY
    />
  );
}
