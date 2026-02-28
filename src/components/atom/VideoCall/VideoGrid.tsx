"use client";

import React, { useEffect, useState, useRef } from "react";
import { User, Mic, MicOff, Video, VideoOff, PhoneOff, MoreVertical } from "lucide-react";

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  peers: Record<string, MediaStream>;
  peerMetadata?: Record<string, any>;
  isCameraOff: boolean;
  localStream: MediaStream | null;

}

export default function VideoGrid({
  localVideoRef,
  peers,
  peerMetadata = {},
  isCameraOff,
  localStream,

}: VideoGridProps) {
  const peerEntries = Object.entries(peers);
  const peerCount = peerEntries.length;

  // Grid logic only for remote participants
  const getGridLayout = () => {
    if (peerCount === 0) return "max-w-md grid-cols-1";
    if (peerCount === 1) return "max-w-5xl grid-cols-1";
    if (peerCount === 2) return "max-w-6xl grid-cols-1 md:grid-cols-2";
    return "max-w-7xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 flex flex-col overflow-hidden font-sans">

      {/* 🟢 MAIN REMOTE GRID AREA */}
      <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <div className={`grid gap-4 w-full transition-all duration-500 ${getGridLayout()}`}>
          {peerCount === 0 ? (
            <div className="flex flex-col items-center gap-4 text-zinc-500">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 animate-spin flex items-center justify-center">
                <User size={24} />
              </div>
              <p className="text-sm font-medium tracking-wide uppercase">Waiting for others to join...</p>
            </div>
          ) : (
            peerEntries.map(([id, stream]) => {
              const displayName = peerMetadata[id]?.displayName || `User ${id.slice(0, 4)}`;
              return (
                <TileContainer key={id} label={displayName}>
                  <RemoteVideoTile stream={stream} />
                </TileContainer>
              );
            })
          )}
        </div>
      </div>

      {/* 🔵 LOCAL USER TILE (Floating Picture-in-Picture) */}
      <div className="absolute bottom-24 right-6 w-40 md:w-64 aspect-video z-50 shadow-2xl transition-all duration-300">
        <TileContainer label="You" isLocal>
          {isCameraOff ? (
            <CameraOffPlaceholder />
          ) : (
            <LocalVideoTile
              videoRef={localVideoRef}
              stream={localStream}
            />
          )}
        </TileContainer>
      </div>
    </div>
  );
}

/* ---------------- SUB COMPONENTS ---------------- */

function LocalVideoTile({
  videoRef,
  stream,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
}) {
  useEffect(() => {
    if (!videoRef.current || !stream) return;
    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => { });
    }
  }, [stream, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover bg-black scale-x-[-1]" // Mirrored for local user
    />
  );
}

function RemoteVideoTile({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (!videoTrack) {
      setIsVideoEnabled(false);
      return;
    }

    const update = () => setIsVideoEnabled(videoTrack.enabled && videoTrack.readyState === "live");
    videoTrack.onmute = update;
    videoTrack.onunmute = update;
    update();

    return () => {
      videoTrack.onmute = null;
      videoTrack.onunmute = null;
    };
  }, [stream]);

  return isVideoEnabled ? (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  ) : (
    <CameraOffPlaceholder />
  );
}

function TileContainer({
  children,
  label,
  isLocal = false,
}: {
  children: React.ReactNode;
  label: string;
  isLocal?: boolean;
}) {
  return (
    <div className="relative w-full h-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 ring-1 ring-white/10 shadow-lg">
      {children}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-lg">
        <span className="text-[12px] text-white font-medium">{label}</span>
      </div>
    </div>
  );
}


function CameraOffPlaceholder() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-900">
      <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
        <User size={40} className="text-zinc-600" />
      </div>
    </div>
  );
}