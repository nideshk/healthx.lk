"use client";

import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

export default function ControlsBar({
  isMuted,
  isCameraOff,
  toggleMic,
  toggleCamera,
  leaveRoom,
  onJoin,
}: {
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  leaveRoom: () => void;
  onJoin: () => void;
}) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex gap-4 bg-white/10 p-4 rounded-full">
      <button onClick={toggleMic}>
        {isMuted ? <MicOff /> : <Mic />}
      </button>
      <button onClick={toggleCamera}>
        {isCameraOff ? <VideoOff /> : <Video />}
      </button>
      <button onClick={leaveRoom}>
        <PhoneOff />
      </button>
    </div>
  );
}
