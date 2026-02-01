"use client";

import React, { useEffect } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import { Camera } from "lucide-react";
import ConsultationPanel from "./ConsultationPanel";
import { logCallEvent } from "@/lib/logCallEvent";

export default function VideoCallContainer({
  appointmentId,
  token,
  role,
}: {
  appointmentId: string;
  token?: string; // pass guest token if any
  role: "patient" | "practitioner" | "attendee";
}) {
  const isPractitioner = role === "practitioner";

  const {
    localVideoRef,
    peers,
    joined,
    isMuted,
    isCameraOff,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
  } = useVideoCall({ token: token! });

  /* ---------------- JOIN / LEAVE ---------------- */

  const handleJoin = async () => {
    await joinRoom();
    logCallEvent({
      appointmentId,
      eventType: "joined_call",
      token,
      metadata: { role },
    });
  };

  const handleLeave = async () => {
    logCallEvent({
      appointmentId,
      eventType: "left_call",
      token,
      metadata: { role },
    });
    await leaveRoom();
  };

  /* ---------------- CONTROLS ---------------- */

  const handleToggleMic = () => {
    logCallEvent({
      appointmentId,
      eventType: isMuted ? "MIC_ON" : "MIC_OFF",
      token,
    });
    toggleMic();
  };

  const handleToggleCamera = () => {
    logCallEvent({
      appointmentId,
      eventType: isCameraOff ? "CAMERA_ON" : "CAMERA_OFF",
      token,
    });
    toggleCamera();
  };

  /* ---------------- HEARTBEAT ---------------- */

  useEffect(() => {
    if (!joined) return;

    let lastSent = 0;

    const sendHeartbeat = () => {
      const now = Date.now();
      if (now - lastSent < 20000) return;
      lastSent = now;

      logCallEvent({
        appointmentId,
        eventType: "heartbeat",
        token,
      });
    };

    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [joined, appointmentId, token]);

  /* ---------------- TAB / VISIBILITY SAFETY ---------------- */

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && joined) {
        logCallEvent({
          appointmentId,
          eventType: "left_call",
          token,
        });
      }
    };

    window.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [joined, appointmentId, token]);

  /* ---------------- UI ---------------- */

  return (
    <div className="h-screen w-screen bg-[#1b1c1e] text-white flex">
      <div className={`flex flex-col h-full ${isPractitioner ? "w-[70%]" : "w-full"}`}>
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-4">
              <Camera size={36} /> Telehealth Consultation
            </h1>
            <button
              onClick={handleJoin}
              className="bg-green-600 px-6 py-3 rounded-2xl text-lg font-semibold"
            >
              Join Consultation
            </button>
          </div>
        ) : (
          <>
            <VideoGrid
              localVideoRef={localVideoRef}
              peers={peers}
              isCameraOff={isCameraOff}
            />
            <ControlsBar
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              toggleMic={handleToggleMic}
              toggleCamera={handleToggleCamera}
              leaveRoom={handleLeave}
            />
          </>
        )}
      </div>

      {isPractitioner && <ConsultationPanel appointmentId={appointmentId} />}
    </div>
  );
}
