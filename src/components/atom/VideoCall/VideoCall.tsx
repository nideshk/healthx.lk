"use client";

import React, { useCallback, useState, useEffect } from "react";
import VideoGrid from "./VideoGrid";
import ControlsBar from "./ControlsBar";
import { useVideoCall } from "./useVideoCall";
import Toaster from "./Toaster";

export default function VideoCallContainer({
  appointmentId,
  roomKey,
  token,
  localUserId,
  role,
  iceServers,
}: any) {
  /* -------------------- TOASTS ---------------------- */
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string }>
  >([]);

  console.log(roomKey)
  const addToast = useCallback((message: string, ttl = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((s) => [...s, { id, message }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), ttl);
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

    onUserJoin: (id: string) => addToast(`User ${id.slice(0, 5)} joined`),
    onUserLeave: (id: string) => addToast(`User ${id.slice(0, 5)} left`),
  });

  const isPractitioner = role === "practitioner";

  /* -------------------- LEAVE ---------------------- */
  const handleLeave = async () => {
    await leaveRoom();
  };

  /* -------------------- MAIN LAYOUT ---------------------- */
  return (
    <div className="h-screen w-screen bg-[#1b1c1e] text-white overflow-hidden flex">

      {/* LEFT SIDE — FULL VIDEO AREA */}
      <div
        className={`flex flex-col h-full ${
          isPractitioner ? "w-[70%]" : "w-full"
        } border-r border-white/10`}
      >
        {!joined ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">
              🎥 Telehealth Consultation
            </h1>
            <button
              onClick={joinRoom}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-full text-lg font-semibold"
            >
              Join Consultation
            </button>
          </div>
        ) : (
          <>
            {/* Video grid fills all available vertical space */}
            <div className="flex-1 overflow-hidden">
              <VideoGrid
                localVideoRef={localVideoRef}
                peers={peers}
                peerCameras={peerCameras}
                isCameraOff={isCameraOff}
              />
            </div>

            {/* Controls aligned bottom center */}
            <div className="pb-4">
              <ControlsBar
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                toggleCamera={toggleCamera}
                toggleScreenShare={toggleScreenShare}
                toggleMic={toggleMic}
                leaveRoom={handleLeave}
              />
            </div>
          </>
        )}
      </div>

      {/* RIGHT SIDE — PRACTITIONER PANEL */}
     {isPractitioner && (
  <div
    className="w-[30%] bg-[#f9fafb] h-full p-6 flex flex-col overflow-y-auto border-l border-gray-200"
    style={{ minWidth: 340, maxWidth: 420 }}
  >
    <h2 className="text-xl font-semibold text-gray-800 mb-6">
      Consultation Tools
    </h2>

    {/* APPOINTMENT DETAILS */}
    <div className="mb-6 p-4 rounded-xl bg-white shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-600">Appointment ID</h3>
      <p className="text-gray-900 mt-1 text-sm font-semibold tracking-wide">
        {appointmentId}
      </p>
    </div>

    {/* NOTES */}
    <div className="flex flex-col p-4 rounded-xl bg-white shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>

      <textarea
        className="w-full min-h-[200px] p-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        placeholder="Write practitioner notes here..."
      />

      <button
        className="mt-3 inline-flex justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition shadow-sm"
      >
        Save Notes
      </button>
    </div>

  </div>
)}


      <Toaster toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
