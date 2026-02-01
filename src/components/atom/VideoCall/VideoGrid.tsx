"use client";

import React, { useEffect, useState, useRef } from "react";
import { User } from "lucide-react";

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  peers: Record<string, MediaStream>;
  isCameraOff: boolean;
  localStream: MediaStream | null;
}

export default function VideoGrid({
  localVideoRef,
  peers,
  isCameraOff,
  localStream,
}: VideoGridProps) {
  const peerEntries = Object.entries(peers);
  const totalTiles = 1 + peerEntries.length;

  const getGridLayout = () => {
    if (totalTiles === 1) return "max-w-xl grid-cols-1";
    if (totalTiles === 2) return "max-w-4xl grid-cols-1 md:grid-cols-2";
    if (totalTiles === 3) return "max-w-6xl grid-cols-1 md:grid-cols-2";
    if (totalTiles >= 4) return "max-w-7xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-1";
  };

  return (
    <div className="w-full h-screen bg-zinc-950 p-4 md:p-8 flex items-center justify-center overflow-hidden">
      <div
        className={`grid gap-4 w-full transition-all duration-500 ${getGridLayout()}`}
      >
        {/* 🔵 LOCAL USER TILE */}
        <TileContainer label="You" isLocal>
          {isCameraOff ? (
            <CameraOffPlaceholder />
          ) : (
            <LocalVideoTile
              videoRef={localVideoRef}
              stream={localStream}
              isCameraOff={isCameraOff}
            />
          )}
        </TileContainer>

        {/* 🟢 REMOTE PEERS */}
        {peerEntries.map(([id, stream]) => (
          <TileContainer key={id} label={`User ${id.slice(0, 4)}`}>
            <RemoteVideoTile stream={stream} />
          </TileContainer>
        ))}
      </div>
    </div>
  );
}


function LocalVideoTile({
  videoRef,
  stream,
  isCameraOff,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isCameraOff: boolean;
}) {
  useEffect(() => {
    if (!videoRef.current || !stream) return;

    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => { });
    }
  }, [stream, videoRef]);

  if (isCameraOff) return <CameraOffPlaceholder />;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover bg-black"
    />
  );
}


/* ---------------- SUB COMPONENTS ---------------- */

function RemoteVideoTile({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    const videoTrack = stream.getVideoTracks()[0];

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    if (!videoTrack) {
      setIsVideoEnabled(false);
      return;
    }

    const update = () => {
      setIsVideoEnabled(
        videoTrack.enabled && videoTrack.readyState === "live"
      );
    };

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
    <div className="relative w-full aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      {children}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/5">
        <span
          className={`w-2 h-2 rounded-full ${isLocal ? "bg-blue-500" : "bg-green-500"
            }`}
        />
        <span className="text-[11px] text-white font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}

function CameraOffPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-900 text-zinc-600">
      <div className="relative">
        <User size={64} strokeWidth={1.5} />
        <div className="absolute -bottom-1 -right-1 bg-zinc-950 p-1 rounded-full border border-zinc-800">
          <User size={16} className="text-red-500/80" />
        </div>
      </div>
    </div>
  );
}
