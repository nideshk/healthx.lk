"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import VideoCallContainer from "@/components/atom/VideoCall/VideoCall";
import { authFetch } from "@/lib/authFetch";
import { ArrowLeft } from "lucide-react";

type AuthorizeResponse = {
  authorized: boolean;
  role: "patient" | "practitioner" | "attendee";
  appointmentId: string;
  roomKey: string;
  token: string; // APP AUTH TOKEN
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

  const router = useRouter();
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

        const res = await fetch("/api/telehealth/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: inviteToken, roomKey: roomKey }),
        });

        const authJson: AuthorizeResponse = await res.json();

        if (!res.ok || !authJson.authorized) {
          setError(authJson.error ?? "Authorization failed");
          return;
        }

        setAuthData(authJson);

        // store short-lived media token
        localStorage.setItem("telehealth_token", authJson.token);

        /* -------- STEP 2: FETCH IVS TOKEN -------- */
        const ivsRes = await fetch("/api/ivs/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: authJson.appointmentId,
            role: authJson.role,
          }),
        });

        const ivsJson = await ivsRes.json();

        if (!ivsRes.ok) {
          setError(ivsJson.error || "Failed to get video token");
          return;
        }

        // IVS participant token
        setIvsToken(ivsJson.token.token);
      } catch (e: any) {
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

  /* ---------------- ERROR STATE ---------------- */
  if (!ivsToken || !authData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-6">
        <p className="text-lg font-semibold">
          {error ?? "You are not allowed to join this consultation"}
        </p>

        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <VideoCallContainer
      appointmentId={authData.appointmentId}
      role={authData.role || "attendee"}
      token={ivsToken} // IVS participant token
    />
  );
}
