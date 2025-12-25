"use client";

import React, { useCallback, useState } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import Toaster from "./Toaster";
import { logAuditEvent } from "@/lib/logAuditEvent";

export default function VideoCallContainer({
  appointmentId,
  roomKey,
  token,
  localUserId,
  role,
  iceServers,
}: any) {
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string }>
  >([]);

  const addToast = useCallback((message: string, ttl = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((s) => [...s, { id, message }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), ttl);
  }, []);

  const {
    localVideoRef,
    peers,
    peerCameras,
    joined,
    isMuted,
    isCameraOff,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useVideoCall({
    appointmentId,
    roomKey,
    localUserId,
    token,
    role,
    iceServers,
    onUserJoin: (id: string) => addToast(`User ${id.slice(0, 5)} joined`),
    onUserLeave: (id: string) => addToast(`User ${id.slice(0, 5)} left`),
  });

  const handleJoin = async () => {
    await joinRoom();
    logAuditEvent({
      appointmentId,
      eventType: "joined_call",
      metadata: { role },
      token,
    });
  };

  const handleLeave = async () => {
    await leaveRoom();
    logAuditEvent({
      appointmentId,
      eventType: "left_call",
      metadata: { role },
      token,
    });
  };

  return (
    <div className="h-screen w-screen bg-[#1b1c1e] text-white flex">
      <div className="flex flex-col h-full w-full">
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <h1 className="text-3xl font-bold">🎥 Telehealth Consultation</h1>
            <button
              onClick={handleJoin}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-full text-lg"
            >
              Join Consultation
            </button>
          </div>
        ) : (
          <>
            <VideoGrid
              localVideoRef={localVideoRef}
              peers={peers}
              peerCameras={peerCameras}
              isCameraOff={isCameraOff}
            />

            <ControlsBar
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              toggleMic={() => {
                toggleMic();
                logAuditEvent({
                  appointmentId,
                  eventType: isMuted ? "mic_unmuted" : "mic_muted",
                  token,
                });
              }}
              toggleCamera={async() => {
                toggleCamera();
                logAuditEvent({
                  appointmentId,
                  eventType: isCameraOff
                    ? "camera_enabled"
                    : "camera_disabled",
                  token,
                });
              }}
              toggleScreenShare={async() => {
                toggleScreenShare();
                logAuditEvent({
                  appointmentId,
                  eventType: isScreenSharing
                    ? "screen_share_stopped"
                    : "screen_share_started",
                  token,
                });
              }}
              leaveRoom={handleLeave}
            />
          </>
        )}
      </div>

      <Toaster toasts={toasts} removeToast={(id) =>
        setToasts((s) => s.filter((t) => t.id !== id))
      } />
    </div>
  );
}
