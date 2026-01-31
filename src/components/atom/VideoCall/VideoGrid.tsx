"use client";

import { User } from "lucide-react";
import React from "react";

export default function VideoGrid({
  localVideoRef,
  peers,
  isCameraOff,
}: {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  peers: Record<string, MediaStream>;
  isCameraOff: boolean;
}) {
  const peerEntries = Object.entries(peers);
  const totalTiles = 1 + peerEntries.length;

  // Dynamic grid columns
  const gridCols =
    totalTiles === 1
      ? "grid-cols-1"
      : totalTiles === 2
        ? "grid-cols-2"
        : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid ${gridCols} gap-4 p-4 h-full`}>
      {/* ---------- REMOTE PEERS ---------- */}
      {peerEntries.map(([id, stream]) => {
        const hasVideo = stream.getVideoTracks().some(
          (t) => t.readyState === "live" && t.enabled
        );

        return (
          <div key={id} className="relative bg-black rounded-xl">
            {hasVideo ? <VideoTile stream={stream} /> : <CameraOff />}
            <Label>{id.slice(0, 5)}</Label>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Helpers ---------- */

function VideoTile({ stream }: { stream: MediaStream }) {
  const ref = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}

function CameraOff() {
  return (
    <div className="flex items-center justify-center w-full h-full text-gray-400">
      <User size={40} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">
      {children}
    </span>
  );
}
