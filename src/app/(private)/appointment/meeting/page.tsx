"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoCallContainer from "@/components/atom/VideoCall/VideoCall";

type AuthorizeResponse =
  | {
      authorized: true;
      token: string;
      role: string;
      appointmentId: string;
      roomKey: string;
      telehealthUrl?: string;
    }
  | {
      authorized: false;
      error?: string;
    };

export default function MeetingPage() {
  const params = useSearchParams();
  const roomKey = params.get("room") ?? "";

  const [loading, setLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthorizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [isGuestFlow, setIsGuestFlow] = useState(false);

  // First attempt: as logged-in user
  useEffect(() => {
    if (!roomKey) {
      setError("Missing room key");
      setLoading(false);
      return;
    }

    async function tryAuthorizeAsSession() {
      setLoading(true);
      try {
        const res = await fetch("/api/telehealth/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomKey }),
        });

        if (res.status === 401 || res.status === 403) {
          // not authorized as session -> show guest email flow
          setIsGuestFlow(true);
          setAuthData(null);
        } else {
          const json = (await res.json()) as AuthorizeResponse;
          if (json.authorized) {
            setAuthData(json);
            setError(null);
          } else {
            setIsGuestFlow(true);
            setError(json.error ?? null);
          }
        }
      } catch (e) {
        console.error(e);
        setError("Failed to authorize");
      } finally {
        setLoading(false);
      }
    }

    tryAuthorizeAsSession();
  }, [roomKey]);

  async function handleGuestJoin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telehealth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomKey, guestEmail }),
      });

      const json = (await res.json()) as AuthorizeResponse;
      if (res.ok && json.authorized) {
        setAuthData(json);
        setError(null);
      } else {
        setError(!json.authorized && json.error ? json.error : "Not allowed to join");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to validate email");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !authData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Preparing your consultation…</p>
      </div>
    );
  }

  // If fully authorized → show call UI
  if (authData && authData.authorized) {
    const { appointmentId, token, role, roomKey } = authData;

    // You can compute iceServers from env or a config; for now empty array
    const iceServers: any[] = [];

    // For practitioners: you can wrap with a layout that shows side panel with notes
    const call = (
      <VideoCallContainer
        appointmentId={appointmentId}
        roomKey={roomKey}
        token={token}
        localUserId={guestEmail || "session-user"} // for display only; backend uses token
        role={role}
        iceServers={iceServers}
      />
    );

    

    // Patient / guest: full screen call
    return call;
  }

  // Not authorized yet, show guest email join flow
  if (isGuestFlow && !authData?.authorized) {
    return (
      <div className="h-screen z-50 flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-semibold mb-2">
            Join your telehealth appointment
          </h1>
          <p className="text-sm text-gray-300 mb-4">
            Enter the email where you received this invitation.
          </p>

          <input
            type="email"
            className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-600 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />

          {error && (
            <p className="text-xs text-red-400 mb-2">{error}</p>
          )}

          <button
            onClick={handleGuestJoin}
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-semibold"
          >
            Continue
          </button>

          <p className="mt-3 text-xs text-gray-400">
            You must use the same email that the appointment invite was sent to.
          </p>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
      <p>{error ?? "You are not allowed to join this consultation."}</p>
    </div>
  );
}
