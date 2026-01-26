"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import VideoCallContainer from "@/components/atom/VideoCall/VideoCall";
import { authFetch } from "@/lib/authFetch";

type AuthorizeResponse =
  | {
    authorized: true;
    token: string;
    role: "patient" | "practitioner" | "attendee";
    appointmentId: string;
    roomKey: string;
    error?: string | null;
  }


export default function MeetingPage() {
  const params = useSearchParams();

  const roomKey = params.get("room");
  const inviteToken = params.get("token");

  const [loading, setLoading] = useState(true);
  const [authData, setAuthData] = useState<AuthorizeResponse | null>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function authorize() {
      try {
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

        const res = await authFetch("/api/telehealth/authorize", {
          method: "POST",
          body: JSON.stringify(body),
        });

        const json = (await res.json()) as AuthorizeResponse;
        console.log(json)
        if (res.ok && json.authorized) {
          // ✅ persist token for audit logging
          localStorage.setItem("telehealth_token", json.token);
          setAuthData(json);
        } else {
          setError(json.error);
        }
      } catch (e) {
        console.error(e);
        setError("Authorization failed");
      } finally {
        setLoading(false);
      }
    }

    authorize();
  }, [roomKey, inviteToken]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Preparing your consultation…
      </div>
    );
  }

  if (!authData || !authData.authorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        {error ?? "You are not allowed to join this consultation"}
      </div>
    );
  }

  return (
    <VideoCallContainer
      appointmentId={authData.appointmentId}
      roomKey={authData.roomKey}
      token={authData.token}
      role={authData.role}
      localUserId={authData.role}
      iceServers={[]}
    />
  );
}
