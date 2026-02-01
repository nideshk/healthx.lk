"use client";

import React, { useEffect } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import { Camera, ShieldCheck, Activity } from "lucide-react";
import ConsultationPanel from "./ConsultationPanel";
import { logCallEvent } from "@/lib/logCallEvent";

export default function VideoCallContainer({
  appointmentId,
  token,
  role,
}: {
  appointmentId: string;
  token?: string;
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
    localStream,
  } = useVideoCall({ token: token! });

  /* ---------------- EVENT HANDLERS ---------------- */

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
    logCallEvent({ appointmentId, eventType: "left_call", token, metadata: { role } });
    await leaveRoom();
  };

  const handleToggleMic = () => {
    logCallEvent({ appointmentId, eventType: isMuted ? "MIC_ON" : "MIC_OFF", token });
    toggleMic();
  };

  const handleToggleCamera = () => {
    logCallEvent({ appointmentId, eventType: isCameraOff ? "CAMERA_ON" : "CAMERA_OFF", token });
    toggleCamera();
  };

  /* ---------------- LOGGING EFFECTS ---------------- */

  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => {
      logCallEvent({ appointmentId, eventType: "heartbeat", token });
    }, 20000);
    return () => clearInterval(interval);
  }, [joined, appointmentId, token]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && joined) {
        logCallEvent({ appointmentId, eventType: "switched_tab", token });
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    return () => window.removeEventListener("visibilitychange", handleVisibility);
  }, [joined, appointmentId, token]);

  /* ---------------- UI ---------------- */

  return (
    <div className="h-screen w-screen bg-[#0f1113] text-zinc-100 flex overflow-hidden">
      {/* 🟢 LEFT SIDE: VIDEO SECTION */}
      <div className={`flex flex-col h-full transition-all duration-500 relative ${isPractitioner ? "w-[65%] lg:w-[70%]" : "w-full"}`}>

        {!joined ? (
          // --- STYLISH PRE-JOIN SCREEN ---
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-zinc-900 to-black p-6">
            <div className="w-full max-w-md space-y-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-blue-500/10 rounded-full text-blue-500">
                  <Activity size={48} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Consultation Room</h1>
                <p className="text-zinc-400 text-sm">Ready to start your secure telehealth session?</p>
              </div>

              <div className="p-6 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-6 shadow-xl">
                <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  <ShieldCheck size={16} className="text-green-500" />
                  End-to-End Encrypted
                </div>

                <button
                  onClick={handleJoin}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20"
                >
                  Join Consultation
                </button>
              </div>
            </div>
          </div>
        ) : (
          // --- ACTIVE CALL INTERFACE ---
          <>
            <div className="flex-1 relative overflow-hidden">
              <VideoGrid
                localVideoRef={localVideoRef}
                peers={peers}
                isCameraOff={isCameraOff}
                localStream={localStream}
              />
            </div>

            {/* INTEGRATED CONTROLS BAR */}
            <div className="h-24 flex items-center justify-center border-t border-white/5 bg-zinc-950/50 backdrop-blur-md">
              <ControlsBar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                toggleMic={handleToggleMic}
                toggleCamera={handleToggleCamera}
                leaveRoom={handleLeave}
              />
            </div>
          </>
        )}
      </div>

      {/* 🔵 RIGHT SIDE: PRACTITIONER PANEL */}
      {isPractitioner && (
        <div className="absolute right-0 border-l border-white/5 bg-zinc-900/30 backdrop-blur-sm h-full overflow-y-auto">
          <ConsultationPanel appointmentId={appointmentId} />
        </div>
      )}
    </div>
  );
}