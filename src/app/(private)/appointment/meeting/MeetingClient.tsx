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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ivsToken, setIvsToken] = useState<string | null>(null);
  const [authData, setAuthData] = useState<AuthorizeResponse | null>(null);

  useEffect(() => {
    async function init() {
      try {
        /* -------- STEP 0: WAIT FOR SESSION (Magic Link) -------- */
        // We give Supabase a moment to process the session from the URL if needed
        let sessionRetryCount = 0;
        const maxSessionRetries = 3;
        
        async function waitForAuth() {
          try {
            return await authFetch("/api/telehealth/authorize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: inviteToken, roomKey: roomKey }),
            });
          } catch (e: any) {
            if (e.message === "Not authenticated" && sessionRetryCount < maxSessionRetries) {
              sessionRetryCount++;
              await new Promise(r => setTimeout(r, 1000)); // wait 1s
              return waitForAuth();
            }
            throw e;
          }
        }

        const res = await waitForAuth();

        const authJson: AuthorizeResponse = await res.json();

        if (!res.ok || !authJson.authorized) {
          setError(authJson.error ?? "Authorization failed");
          return;
        }

        setAuthData(authJson);

        // store short-lived media token
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

        if (!ivsRes.ok) {
          setError(ivsJson.error || "Failed to get video token");
          return;
        }

        // IVS participant token
        setIvsToken(ivsJson.token.token);
      } catch (e: any) {
        console.error(e);
        if (e.message === "Not authenticated") {
          setError("authentication_required");
        } else {
          setError("Failed to prepare video call");
        }
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
  if (error === "authentication_required" || !ivsToken || !authData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-6">
        <p className="text-lg font-semibold px-6 text-center">
          {error === "authentication_required" 
            ? "You need to be signed in to join this meeting." 
            : (error ?? "You are not allowed to join this consultation")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {error === "authentication_required" && (
            <button
              onClick={() => router.push(`/?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
            >
              Sign In to Join
            </button>
          )}

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
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
