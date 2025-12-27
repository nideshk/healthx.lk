"use client";

import React, { useCallback, useEffect, useState } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import Toaster from "./Toaster";
import { logCallEvent } from "@/lib/logCallEvent";
import ConsultationPanel from "./ConsultationPanel";

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function VideoCallContainer({
  appointmentId,
  roomKey,
  token,
  localUserId,
  role,
  iceServers,
}: any) {
  const isPractitioner = role === "practitioner";

  /* -------------------- TOASTS ---------------------- */
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string }>
  >([]);

  const addToast = useCallback((message: string, ttl = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((s) => [...s, { id, message }]);
    setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, ttl);
  }, []);

  const removeToast = (id: string) =>
    setToasts((s) => s.filter((t) => t.id !== id));

  /* -------------------- VIDEO CALL HOOK ---------------------- */
  const {
    localVideoRef,
    peers,
    peerCameras,
    joined,
    isMuted,
    isCameraOff,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useVideoCall({
    appointmentId,
    roomKey,
    localUserId,
    token,
    role,
    iceServers,
    onUserJoin: (id: string) =>
      addToast(`User ${id.slice(0, 5)} joined`),
    onUserLeave: (id: string) =>
      addToast(`User ${id.slice(0, 5)} left`),
  });

  /* -------------------- HEARTBEAT ---------------------- */
  useEffect(() => {
    if (!joined) return;

    let lastHeartbeatAt = 0;

    const sendHeartbeat = () => {
      const now = Date.now();
      if (now - lastHeartbeatAt < 20000) return;
      lastHeartbeatAt = now;

      logCallEvent({
        appointmentId,
        eventType: "heartbeat",
      });
    };

    const interval = setInterval(sendHeartbeat, 5000);
    return () => clearInterval(interval);
  }, [joined, appointmentId]);

  const handleJoin = async () => {
    await joinRoom();
    logCallEvent({ appointmentId, eventType: "joined_call" });
  };

  const handleLeave = async () => {
    logCallEvent({ appointmentId, eventType: "left_call" });
    await leaveRoom();
  };

  /* -------------------- ENCOUNTER STATE ---------------------- */
  const [saving, setSaving] = useState(false);
  const [clinicianNotes, setClinicianNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string | null>(null);
  const [followUpComments, setFollowUpComments] = useState("");

  /* -------------------- LOAD EXISTING ENCOUNTER ---------------------- */
  useEffect(() => {
    if (!isPractitioner || !appointmentId) return;

    fetch(`/api/encounters/${appointmentId}`)
      .then((res) => res.json())
      .then((res) => {
        if (!res?.encounter) return;

        setClinicianNotes(res.encounter.clinician_notes ?? "");
        setPrescriptions(res.encounter.prescriptions ?? "");
        setFollowUpNeeded(res.encounter.follow_up_needed ?? false);
        setFollowUpDate(res.encounter.follow_up_date ?? null);
        setFollowUpComments(res.encounter.follow_up_comments ?? "");
      })
      .catch(() => {});
  }, [appointmentId, isPractitioner]);

  /* -------------------- SAVE ENCOUNTER ---------------------- */
  const saveEncounter = async () => {
    if (followUpNeeded && !followUpDate) {
      addToast("Select follow-up date");
      return;
    }

    setSaving(true);

    await fetch(`/api/encounters/${appointmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinician_notes: clinicianNotes,
        prescriptions,
        follow_up_needed: followUpNeeded,
        follow_up_date: followUpNeeded ? followUpDate : null,
        follow_up_comments: followUpComments,
      }),
    });

    setSaving(false);
    addToast("Consultation saved");
  };

  /* -------------------- UI ---------------------- */
  return (
    <div className="h-screen w-screen bg-[#1b1c1e] text-white flex overflow-hidden">

      {/* LEFT — VIDEO */}
      <div
        className={`flex flex-col h-full ${
          isPractitioner ? "w-[70%]" : "w-full"
        } border-r border-white/10`}
      >
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <h1 className="text-3xl font-bold">
              🎥 Telehealth Consultation
            </h1>
            <button
              onClick={handleJoin}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-full text-lg font-semibold"
            >
              Join Consultation
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-hidden">
              <VideoGrid
                localVideoRef={localVideoRef}
                peers={peers}
                peerCameras={peerCameras}
                isCameraOff={isCameraOff}
              />
            </div>

            <div className="pb-4">
              <ControlsBar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                toggleCamera={toggleCamera}
                toggleScreenShare={toggleScreenShare}
                toggleMic={toggleMic}
                leaveRoom={handleLeave}
                onJoin={handleJoin}
              />
            </div>
          </>
        )}
      </div>

      {/* RIGHT — PRACTITIONER PANEL */}
      {isPractitioner && (
        <ConsultationPanel appointmentId={appointmentId}/>
      )}

      <Toaster toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

/* -------------------- SMALL UI HELPERS ---------------------- */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white rounded-xl border space-y-2">
      <h3 className="text-sm font-medium text-gray-700">
        {title}
      </h3>
      {children}
    </div>
  );
}
