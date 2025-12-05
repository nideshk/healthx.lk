// VideoCallContainer.tsx
"use client"
import React, { useCallback, useState, useEffect } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import Toaster from "./Toaster";
import { logAuditEvent } from "@/lib/logAuditEvent";

export default function VideoCallContainer({ appointmentId, localUserId } : any) {
  const [toasts, setToasts] = useState<any>([]);

  const addToast = useCallback((message: string, ttl = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((s:any) => [...s, { id, message }]);
    setTimeout(() => setToasts((s:any) => s.filter((t:any) => t.id !== id)), ttl);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((s:any) => s.filter((t:any) => t.id !== id));
  }, []);

  const {
    localVideoRef,
    peers,
    peerCameras,
    joined,
    roomId,
    isMuted,
    isCameraOff,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useVideoCall({
    onUserJoin: async (id) => {
      addToast(`User ${id.slice(0, 5)} joined`);
      await logAuditEvent({
        appointmentId,
        userId: id,
        eventType: "JOIN",
        metadata: { timestamp: Date.now() },
      });
    },
    onUserLeave: async (id) => {
      addToast(`User ${id.slice(0, 5)} left`);
      await logAuditEvent({
        appointmentId,
        userId: id,
        eventType: "LEAVE",
        metadata: { timestamp: Date.now() },
      });
    },
  });

  // Log when LOCAL user joins
  useEffect(() => {
    if (joined) {
      addToast("You joined the room");
      logAuditEvent({
        appointmentId,
        userId: localUserId,
        eventType: "LOCAL_JOIN",
      });
    }
  }, [joined]);

  // Log when LOCAL user leaves
  const handleLeave = async () => {
    await logAuditEvent({
      appointmentId,
      userId: localUserId,
      eventType: "LOCAL_LEAVE",
    });
    await leaveRoom();
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#1b1c1e] to-[#2a2d31] text-white flex flex-col items-center justify-center overflow-hidden">
      {!joined ? (
        <div className="flex flex-col items-center gap-6 p-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">🎥 Group Video Call</h1>
          <p className="text-gray-400 text-sm sm:text-base">Joining room: <span className="text-white font-medium">{roomId || "..."}</span></p>
          <button
            onClick={joinRoom}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-full text-lg font-semibold shadow-lg"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col h-full w-full overflow-hidden">
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
            toggleCamera={async () => {
              await logAuditEvent({
                appointmentId,
                userId: localUserId,
                eventType: isCameraOff ? "CAMERA_ON" : "CAMERA_OFF",
              });
              return toggleCamera();
            }}
            toggleScreenShare={async () => {
              await logAuditEvent({
                appointmentId,
                userId: localUserId,
                eventType: isScreenSharing ? "SCREEN_SHARE_STOP" : "SCREEN_SHARE_START",
              });
              return toggleScreenShare();
            }}
            toggleMic={async () => {
              await logAuditEvent({
                appointmentId,
                userId: localUserId,
                eventType: isMuted ? "MIC_ON" : "MIC_OFF",
              });
              return toggleMic();
            }}
            leaveRoom={handleLeave}
          />
        </div>
      )}

      <Toaster toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
