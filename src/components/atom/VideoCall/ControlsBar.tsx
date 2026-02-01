"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import React from "react";

interface ControlsBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  leaveRoom: () => void;
}

export default function ControlsBar({
  isMuted,
  isCameraOff,
  toggleMic,
  toggleCamera,
  leaveRoom,
}: ControlsBarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">

      {/* MIC BUTTON */}
      <ControlButton
        onClick={toggleMic}
        active={!isMuted}
        variant={isMuted ? "danger" : "default"}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </ControlButton>

      {/* CAMERA BUTTON */}
      <ControlButton
        onClick={toggleCamera}
        active={!isCameraOff}
        variant={isCameraOff ? "danger" : "default"}
        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
      </ControlButton>

      {/* LEAVE BUTTON */}
      <div className="w-px h-8 bg-white/10 mx-2" /> {/* Divider */}

      <ControlButton
        onClick={leaveRoom}
        active={false}
        variant="hangup"
        title="Leave Meeting"
      >
        <PhoneOff size={22} fill="currentColor" />
      </ControlButton>
    </div>
  );
}

/* ---------------- HELPER COMPONENT ---------------- */

function ControlButton({
  children,
  onClick,
  active,
  variant,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  variant: "default" | "danger" | "hangup";
  title: string;
}) {
  const baseStyles = "p-4 rounded-xl transition-all duration-200 flex items-center justify-center";

  const variants = {
    default: active
      ? "bg-zinc-800 text-white hover:bg-zinc-700"
      : "bg-zinc-800 text-white hover:bg-zinc-700",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
    hangup: "bg-red-600 text-white hover:bg-red-700 hover:scale-105 shadow-lg shadow-red-900/20",
  };

  return (
    <button
      title={title}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}