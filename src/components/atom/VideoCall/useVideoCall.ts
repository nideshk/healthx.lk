"use client";

import { useRef, useState } from "react";

type IVSModule = typeof import("amazon-ivs-web-broadcast");

export function useVideoCall({ token }: { token: string }) {
  if (!token || typeof token !== "string") {
    throw new Error("IVS token must be a raw participant JWT");
  }

  const stageRef = useRef<any>(null);
  const ivsRef = useRef<IVSModule | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  /* ---------------- JOIN ---------------- */

  const joinRoom = async () => {
    if (stageRef.current) return;

    // 🔥 Dynamic import (SSR-safe)
    if (!ivsRef.current) {
      ivsRef.current = await import("amazon-ivs-web-broadcast");
    }

    const {
      Stage,
      StageEvents,
      LocalStageStream,
      SubscribeType,
    } = ivsRef.current;

    // 1️⃣ Get local media
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    localStreamRef.current = stream;
    audioTrackRef.current = stream.getAudioTracks()[0];
    videoTrackRef.current = stream.getVideoTracks()[0];

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      await localVideoRef.current.play().catch(() => { });
    }

    // 2️⃣ Create publishable streams
    const audioStream = new LocalStageStream(audioTrackRef.current);
    const videoStream = new LocalStageStream(videoTrackRef.current);

    // 3️⃣ TYPE-CORRECT strategy
    const strategy = {
      stageStreamsToPublish() {
        return [audioStream, videoStream];
      },

      shouldPublishParticipant(_participant: any) {
        return true;
      },

      shouldSubscribeToParticipant(_participant: any) {
        return SubscribeType.AUDIO_VIDEO;
      },
    };

    // 4️⃣ Create Stage
    const stage = new Stage(token, strategy);

    stage.on(
      StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED,
      (participant: any, streams: any[]) => {
        const mediaStream = new MediaStream();
        streams.forEach((s) =>
          mediaStream.addTrack(s.mediaStreamTrack)
        );
        setPeers((prev) => ({ ...prev, [participant.id]: mediaStream }));
      }
    );

    stage.on(
      StageEvents.STAGE_PARTICIPANT_LEFT,
      (participant: any) => {
        setPeers((prev) => {
          const copy = { ...prev };
          delete copy[participant.id];
          return copy;
        });
      }
    );

    await stage.join();
    stageRef.current = stage;
    setJoined(true);
  };

  /* ---------------- LEAVE ---------------- */

  const leaveRoom = async () => {
    await stageRef.current?.leave();
    stageRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    setPeers({});
    setJoined(false);
  };

  /* ---------------- CONTROLS ---------------- */

  const toggleMic = () => {
    if (!audioTrackRef.current) return;
    audioTrackRef.current.enabled = !audioTrackRef.current.enabled;
    setIsMuted(!audioTrackRef.current.enabled);
  };

  const toggleCamera = () => {
    if (!videoTrackRef.current) return;
    videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
    setIsCameraOff(!videoTrackRef.current.enabled);
  };

  return {
    localVideoRef,
    peers,
    joined,
    isMuted,
    isCameraOff,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
  };
}
