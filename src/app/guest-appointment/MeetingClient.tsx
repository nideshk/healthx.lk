"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoCallContainer from "@/components/atom/VideoCall/VideoCall";

type AuthorizeResponse =
  | {
      authorized: true;
      token: string;
      role: "patient" | "practitioner" | "attendee";
      appointmentId: string;
      roomKey: string;
      roomKey1: string; 
      telehealthUrl?: string;
    }
  | {
      authorized: false;
      error?: string;
    };

export default function MeetingPage() {
  const params = useSearchParams();

  const roomKey = params.get("room");
  const inviteToken = params.get("token");

  const [loading, setLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthorizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // 🔐 AUTHORIZE (JWT invite OR session)
  // --------------------------------------------------
  useEffect(() => {
    async function authorize() {
      setLoading(true);
      setError(null);

      try {
        // Prefer JWT invite
        const body = inviteToken
          ? { token: inviteToken }
          : roomKey
          ? { roomKey }
          : null;

        if (!body) {
          setError("Missing meeting information");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/telehealth/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const json = (await res.json()) as AuthorizeResponse;

        console.log("Authorize response:", json);
        if (res.ok && json.authorized) {
          setAuthData(json);
        } else {
          setError( "You are not allowed to join this consultation");
        }
      } catch (e) {
        console.error("Authorize failed:", e);
        setError("Failed to authorize consultation");
      } finally {
        setLoading(false);
      }
    }

    authorize();
  }, [roomKey, inviteToken]);

  // --------------------------------------------------
  // ⏳ LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>Preparing your consultation…</p>
      </div>
    );
  }

  // --------------------------------------------------
  // ❌ ERROR
  // --------------------------------------------------
  if (!authData || !authData.authorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>{error ?? "Access denied"}</p>
      </div>
    );
  }

  // --------------------------------------------------
  // ✅ AUTHORIZED → JOIN CALL
  // --------------------------------------------------
  const { appointmentId, token, role, roomKey1 } = authData;
  console.log("Joining call as", authData);

  return (
    <VideoCallContainer
      appointmentId={appointmentId}
      roomKey={authData.roomKey}
      token={token}
      localUserId={role} // purely cosmetic
      role={role}
      iceServers={[]} // add TURN/STUN later
    />
  );
}
