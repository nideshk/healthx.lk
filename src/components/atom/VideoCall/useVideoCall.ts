"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { supabaseClient } from "@/lib/supabaseClient";

const supabase = supabaseClient;

export function useVideoCall(opts?: {
  roomKey?: string;
  appointmentId?: string;
  onUserJoin?: (id: string) => void;
  onUserLeave?: (id: string) => void;
}) {
  const searchParams = useSearchParams();
  const params = useParams();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [peerCameras, setPeerCameras] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const channelRef = useRef<any>(null);
  const peerId = useRef(uuidv4());

  const makingOffer = useRef(false);
  const isPolite = (remoteId: string) => peerId.current > remoteId;

  /* ------------------ ROOM ID ------------------ */
  useEffect(() => {
    const id =
      searchParams.get("room") ||
      opts?.roomKey ||
      (params as any)?.roomId;

    if (id) setRoomId(id);
  }, [searchParams, params, opts?.roomKey]);

  /* ------------------ LOCAL MEDIA ------------------ */
  const setupLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false, // start camera off
    });

    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      await localVideoRef.current.play().catch(() => { });
    }

    setIsCameraOff(true);
    return stream;
  };

  /* ------------------ PEER CONNECTION ------------------ */
  const createPeerConnection = (remoteId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      setPeers((prev) => {
        const existing = prev[remoteId] ?? new MediaStream();

        event.streams[0].getTracks().forEach((track) => {
          if (!existing.getTracks().some((t) => t.id === track.id)) {
            existing.addTrack(track);
          }
        });

        return { ...prev, [remoteId]: existing };
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ice-candidate",
          to: remoteId,
          from: peerId.current,
          candidate: e.candidate,
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      if (makingOffer.current || pc.signalingState !== "stable") return;
      try {
        makingOffer.current = true;
        await pc.setLocalDescription(await pc.createOffer());
        sendSignal({
          type: "offer",
          to: remoteId,
          from: peerId.current,
          sdp: pc.localDescription,
        });
      } finally {
        makingOffer.current = false;
      }
    };

    peerConnections.current[remoteId] = pc;
    return pc;
  };

  /* ------------------ SIGNALING ------------------ */
  const sendSignal = async (payload: any) => {
    await channelRef.current?.send({
      type: "broadcast",
      event: "signal",
      payload: JSON.stringify(payload),
    });
  };

  /* ------------------ JOIN ROOM ------------------ */
  const joinRoom = async () => {
    if (!roomId || joined) return;

    const stream = await setupLocalStream();

    const channel = supabase.channel(roomId, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
      const msg = JSON.parse(payload);
      if (!msg || msg.from === peerId.current) return;

      switch (msg.type) {
        case "join": {
          const pc = createPeerConnection(msg.from, stream);
          opts?.onUserJoin?.(msg.from);
          break;
        }

        case "offer": {
          const pc =
            peerConnections.current[msg.from] ??
            createPeerConnection(msg.from, stream);

          const collision =
            makingOffer.current || pc.signalingState !== "stable";

          if (collision && !isPolite(msg.from)) return;

          if (collision) {
            await pc.setLocalDescription({ type: "rollback" });
          }

          await pc.setRemoteDescription(msg.sdp);
          await pc.setLocalDescription(await pc.createAnswer());

          sendSignal({
            type: "answer",
            to: msg.from,
            from: peerId.current,
            sdp: pc.localDescription,
          });
          break;
        }

        case "answer": {
          await peerConnections.current[msg.from]?.setRemoteDescription(
            msg.sdp
          );
          break;
        }

        case "ice-candidate": {
          await peerConnections.current[msg.from]?.addIceCandidate(
            msg.candidate
          );
          break;
        }

        case "leave": {
          peerConnections.current[msg.from]?.close();
          delete peerConnections.current[msg.from];

          setPeers((p) => {
            const copy = { ...p };
            delete copy[msg.from];
            return copy;
          });

          opts?.onUserLeave?.(msg.from);
          break;
        }

        case "camera-state": {
          setPeerCameras((p) => ({ ...p, [msg.from]: msg.cameraOn }));
          break;
        }
      }
    });

    await channel.subscribe(() => {
      setJoined(true);
      sendSignal({ type: "join", from: peerId.current });
    });
  };

  /* ------------------ TOGGLES ------------------ */
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  };

  const toggleCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    let track = stream.getVideoTracks()[0];

    if (track) {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    } else {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      track = cam.getVideoTracks()[0];
      stream.addTrack(track);

      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender ? sender.replaceTrack(track) : pc.addTrack(track, stream);
      });

      setIsCameraOff(false);
    }

    sendSignal({
      type: "camera-state",
      from: peerId.current,
      cameraOn: !isCameraOff,
    });
  };

  const toggleScreenShare = async () => {
    if (!localStreamRef.current) return;

    if (!isScreenSharing) {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];

      screenTrack.onended = () => toggleScreenShare();

      Object.values(peerConnections.current).forEach((pc) => {
        pc.getSenders()
          .find((s) => s.track?.kind === "video")
          ?.replaceTrack(screenTrack);
      });

      localVideoRef.current!.srcObject = screen;
      setIsScreenSharing(true);
    } else {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach((pc) => {
        pc.getSenders()
          .find((s) => s.track?.kind === "video")
          ?.replaceTrack(camTrack);
      });

      localVideoRef.current!.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    }
  };

  /* ------------------ LEAVE ------------------ */
  const leaveRoom = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnections.current).forEach((pc) => pc.close());

    await sendSignal({ type: "leave", from: peerId.current });
    await channelRef.current?.unsubscribe();

    setJoined(false);
    setPeers({});
    localStreamRef.current = null;
  };

  /* ------------------ AUTO JOIN ------------------ */
  useEffect(() => {
    if (roomId && !joined) joinRoom();
  }, [roomId]);

  return {
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
  };
}
