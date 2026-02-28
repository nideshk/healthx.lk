"use client";

import { useEffect, useRef, useState } from "react";

type IVSModule = typeof import("amazon-ivs-web-broadcast");

export function useVideoCall({ token }: { token: string }) {
  if (!token) throw new Error("IVS token required");

  /* ---------------- REFS ---------------- */

  const ivsRef = useRef<IVSModule | null>(null);
  const stageRef = useRef<any>(null);
  const joiningRef = useRef(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  /* ---------------- STATE ---------------- */

  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [peerMetadata, setPeerMetadata] = useState<Record<string, any>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  /* ---------------- LOGGER ---------------- */

  const logEvent = (event: string, meta?: any) => {
    console.log("[CALL LOG]", {
      event,
      meta,
      at: new Date().toISOString(),
    });
  };

  /* ---------------- JOIN ---------------- */

  const joinRoom = async () => {
    if (joiningRef.current || stageRef.current) return;
    joiningRef.current = true;

    try {
      if (!ivsRef.current) {
        ivsRef.current = await import("amazon-ivs-web-broadcast");
      }

      const {
        Stage,
        StageEvents,
        LocalStageStream,
        SubscribeType,
      } = ivsRef.current;

      /* 1️⃣ Get local media */
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

      /* 2️⃣ Publish / Subscribe strategy */
      const strategy = {
        stageStreamsToPublish() {
          const streams = [];
          if (audioTrackRef.current) {
            streams.push(new LocalStageStream(audioTrackRef.current));
          }
          if (videoTrackRef.current?.enabled) {
            streams.push(new LocalStageStream(videoTrackRef.current));
          }
          return streams;
        },

        shouldPublishParticipant() {
          return true;
        },

        // 🚫 CRITICAL FIX: NEVER subscribe to yourself
        shouldSubscribeToParticipant(participant: any) {
          return participant.isLocal
            ? SubscribeType.NONE
            : SubscribeType.AUDIO_VIDEO;
        },
      };

      /* 3️⃣ Create stage */
      const stage = new Stage(token, strategy);

      /* ---------------- REMOTE EVENTS ---------------- */

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (participant: any) => {
        logEvent("PEER_JOINED", { participantId: participant.id, attributes: participant.attributes });
        setPeerMetadata((prev) => ({
          ...prev,
          [participant.id]: participant.attributes || {},
        }));
      });

      stage.on(
        StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED,
        (participant: any, streams: any[]) => {
          if (participant.isLocal) return;

          setPeers((prev) => {
            const mediaStream =
              prev[participant.id] ?? new MediaStream();

            streams.forEach((s) => {
              if (!mediaStream.getTracks().includes(s.mediaStreamTrack)) {
                mediaStream.addTrack(s.mediaStreamTrack);
              }
            });

            return {
              ...prev,
              [participant.id]: mediaStream,
            };
          });
        }
      );

      stage.on(
        StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED,
        (participant: any) => {
          setPeers((prev) => {
            const stream = prev[participant.id];
            stream?.getTracks().forEach((t) => t.stop());

            const copy = { ...prev };
            delete copy[participant.id];
            return copy;
          });
          // Do not remove metadata here, as participant is still in stage
        }
      );

      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (participant: any) => {
        setPeers((prev) => {
          const stream = prev[participant.id];
          stream?.getTracks().forEach((t) => t.stop());

          const copy = { ...prev };
          delete copy[participant.id];
          return copy;
        });

        setPeerMetadata((prev) => {
          const copy = { ...prev };
          delete copy[participant.id];
          return copy;
        });

        logEvent("PEER_LEFT", { participantId: participant.id });
      });

      stage.on(StageEvents.ERROR, (error: any) => {
        logEvent("STAGE_ERROR", error);
      });

      /* 4️⃣ Join */
      await stage.join();
      stageRef.current = stage;
      setJoined(true);

      logEvent("JOIN_CALL");
    } finally {
      joiningRef.current = false;
    }
  };

  /* ---------------- LEAVE ---------------- */

  const leaveRoom = async () => {
    logEvent("LEAVE_CALL");

    try {
      if (stageRef.current) {
        await stageRef.current.leave();
      }
    } catch {
      // ignore leave errors
    } finally {
      stageRef.current = null;
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop());

    setPeers({});
    setJoined(false);
  };

  /* ---------------- PAGE EXIT SAFETY ---------------- */

  useEffect(() => {
    const forceLeave = async () => {
      if (!stageRef.current) return;
      await stageRef.current.leave().catch(() => { });
      stageRef.current = null;
    };

    window.addEventListener("beforeunload", forceLeave);
    window.addEventListener("pagehide", forceLeave);

    return () => {
      forceLeave();
      window.removeEventListener("beforeunload", forceLeave);
      window.removeEventListener("pagehide", forceLeave);
    };
  }, []);

  /* ---------------- CONTROLS ---------------- */

  const toggleMic = () => {
    if (!audioTrackRef.current) return;

    audioTrackRef.current.enabled = !audioTrackRef.current.enabled;
    setIsMuted(!audioTrackRef.current.enabled);

    logEvent("TOGGLE_MIC", {
      enabled: audioTrackRef.current.enabled,
    });
  };

  const toggleCamera = () => {
    if (!videoTrackRef.current) return;

    videoTrackRef.current.enabled = !videoTrackRef.current.enabled;
    setIsCameraOff(!videoTrackRef.current.enabled);

    logEvent("TOGGLE_CAMERA", {
      enabled: videoTrackRef.current.enabled,
    });
  };

  /* ---------------- EXPORT ---------------- */

  return {
    localVideoRef,
    peers,
    peerMetadata,
    joined,
    isMuted,
    isCameraOff,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    localStream: localStreamRef.current, // 👈 ADD THIS

  };
}
