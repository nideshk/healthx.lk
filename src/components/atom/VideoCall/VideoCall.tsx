"use client";

import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import { Camera } from "lucide-react";
import ConsultationPanel from "./ConsultationPanel";
import React from "react";

export default function VideoCallContainer({
  appointmentId,
  token,
  role,
}: {
  appointmentId: string;
  token: string;
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
  } = useVideoCall({ token });

  return (
    <div className="h-screen w-screen bg-[#1b1c1e] text-white flex">
      <div className={`flex flex-col h-full ${isPractitioner ? "w-[70%]" : "w-full"}`}>
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <h1 className="text-3xl font-bold flex items-center gap-4">
              <Camera size={36} /> Telehealth Consultation
            </h1>
            <button
              onClick={joinRoom}
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
              toggleMic={toggleMic}
              toggleCamera={toggleCamera}
              leaveRoom={leaveRoom}
            />
          </>
        )}
      </div>

      {isPractitioner && <ConsultationPanel appointmentId={appointmentId} />}
    </div>
  );
}

