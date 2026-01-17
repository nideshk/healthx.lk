"use client";

import { redirect, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  Video,
  Share2,
  Pencil,
  Trash2,
  AlertCircle,
  FileText,
  Download,
  Paperclip,
  UserCircle2,
  CalendarDays,
  Clock,
} from "lucide-react";
import Modal from "@/components/atom/Modal/Modal";
import { toast } from "react-toastify";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";

/* ---------------- UI HELPER ---------------- */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const CANCEL_REASONS = [
    "I'm feeling better",
    "Booked by mistake",
    "Need a different time",
    "Found another doctor",
    "Other",
  ];

  useEffect(() => {
    let mounted = true;

    async function fetchAppointment() {
      try {
        const res = await authFetch(
          `/api/booking/appointment/${params.id}`
        );

        if (!res.ok) {
          throw new Error(`Failed to load appointment: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;
        setAppointment(data);
      } catch (err) {
        console.error("Failed to load appointment:", err);
        if (mounted) {
          toast.error("Failed to load appointment");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (params.id) {
      fetchAppointment();
    }

    return () => {
      mounted = false;
    };
  }, [params.id]);


  if (loading)
    return (
      <div className="h-screen flex justify-center items-center">
        <Loader size="lg" />
      </div>
    );

  if (!appointment)
    return <div className="p-10 text-red-500">Appointment not found</div>;

  /* ---------------- TIME ---------------- */
  const tz = appointment.practitioner?.timezone || "Asia/Kolkata";
  const start = DateTime.fromISO(appointment.starts_at).setZone(tz);
  const end = DateTime.fromISO(appointment.ends_at).setZone(tz);

  const readableDate = start.toFormat("EEEE, MMM dd yyyy");
  const readableTime = `${start.toFormat("hh:mm a")} — ${end.toFormat("hh:mm a")}`;

  const isPast = start < DateTime.now();
  const isCancelled = appointment.status === "cancelled";
  const canReschedule = !isPast && !isCancelled && start.diffNow("hours").hours >= 6;

  /* ---------------- SHARE ---------------- */
  async function handleShare() {
    const text = `
Appointment Details

Doctor: ${appointment.practitioner.full_name}
Date: ${readableDate}
Time: ${readableTime}

Join Link:
${appointment.telehealth_url || "Not available"}
    `.trim();

    try {
      if (navigator.share) {
        await navigator.share({ title: "Appointment", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Appointment details copied");
      }
    } catch {
      toast.error("Unable to share appointment");
    }
  }

  /* ---------------- CANCEL ---------------- */
  async function performCancel() {
    const reason =
      cancelReason === "Other" ? customReason.trim() : cancelReason;

    if (!reason) return toast.error("Please provide a reason");

    try {
      await axios.patch(`/api/booking/appointment/${appointment.id}`, {
        action: "cancel",
        reason,
      });
      toast.success("Appointment cancelled");
      router.push("/dashboard/appointment");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to cancel");
    }
  }

  /* ---------------- STATUS BADGE ---------------- */
  const StatusBadge = () => {
    if (isCancelled)
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">
          Cancelled
        </span>
      );
    if (isPast)
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
          Completed
        </span>
      );
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
        Confirmed
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* STATUS BAR */}
      <div className="flex items-center gap-3 p-6 border-b bg-white/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.back()} className="p-2 hover:bg-blue-100 rounded-full">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle2 className="w-7 h-7 text-blue-600" /> Appointment Details
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LEFT: Main Details */}
        <div className="col-span-2 flex flex-col gap-10">
          {/* SUMMARY CARD */}
          <section className="bg-white border rounded-3xl shadow-lg p-8 flex flex-col md:flex-row gap-8 items-center">
            <img
              src={appointment.practitioner.profile_picture_url || "/doctor-placeholder.png"}
              className="w-28 h-28 rounded-full border-2 border-blue-200 object-cover shadow-lg"
              alt="Doctor profile"
            />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-2xl font-bold text-gray-900">
                  Dr. {appointment.practitioner.full_name}
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {appointment.practitioner.specialization?.join(", ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <CalendarDays className="w-4 h-4 text-blue-500" /> {readableDate}
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  <Clock className="w-4 h-4 text-blue-500" /> {readableTime}
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm">
                  <Video className="w-4 h-4" /> Online
                </span>
                <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
                  ⏱ {appointment.appointment_type.duration_mins} mins
                </span>
              </div>
              <div className="mt-4 flex gap-3">
                <input
                  readOnly
                  value={appointment.telehealth_url || "No telehealth link"}
                  className="flex-1 px-4 py-2 text-xs bg-gray-50 border rounded-xl truncate"
                />
                <button
                  disabled={!appointment.telehealth_url || isPast}
                  onClick={() => window.open(appointment.telehealth_url, "_blank")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white disabled:bg-gray-300 shadow"
                >
                  Join
                </button>
              </div>
            </div>
          </section>

          {/* PRE-CONSULTATION CARD */}
          <section className="bg-white border rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b pb-3">
              <Paperclip className="w-6 h-6 text-blue-500" /> Pre-Consultation Notes
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
              <p className="text-xs uppercase text-blue-600 mb-1">Main Concern</p>
              <p className="font-medium text-gray-800 text-lg">
                {appointment?.notes?.raw_payload.note?.concern}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <InfoRow
                label="Expected Outcome"
                value={appointment?.notes?.raw_payload.note?.outcome}
              />
              <InfoRow
                label="Referral"
                value={appointment?.notes?.raw_payload.referral}
              />
            </div>
          </section>

          {/* ATTACHMENTS CARD */}
          <section className="bg-white border rounded-3xl shadow p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b pb-3">
              <FileText className="w-6 h-6 text-blue-500" /> Attachments
            </h2>
            {appointment.attachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments uploaded.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                {appointment.attachments.map((file: any) => {
                  const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.file_name);
                  return (
                    <div
                      key={file.id}
                      className="group border rounded-xl p-4 hover:shadow-lg transition flex flex-col items-center bg-gray-50"
                    >
                      <div className="w-full flex items-center gap-2 mb-2">
                        <Paperclip className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium truncate flex-1">{file.file_name}</span>
                      </div>
                      <div className="relative w-full flex flex-col items-center">
                        {isImage ? (
                          <img
                            src={file.view_url}
                            className="rounded-lg max-h-40 mx-auto border"
                            alt={file.file_name}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 w-full bg-white border rounded-lg text-gray-400">
                            <FileText className="w-10 h-10 mb-2" />
                            <span className="text-xs">No preview</span>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          {isImage && (
                            <a
                              href={file.view_url}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 transition"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: Sidebar for Actions and Status */}
        <div className="col-span-1 flex flex-col gap-10">
          <section className="bg-white border rounded-3xl shadow p-8 sticky top-28">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b pb-3">
              <AlertCircle className="w-6 h-6 text-blue-500" /> Actions
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleShare}
                className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 flex gap-2 items-center font-medium shadow"
              >
                <Share2 className="w-4 h-4" /> Share Appointment
              </button>
              {!isPast && !isCancelled && (
                <>
                  <button
                    disabled={!canReschedule}
                    onClick={() =>
                      router.push(`/dashboard/reschedule/${appointment.id}`)
                    }
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white disabled:bg-gray-300 flex gap-2 items-center font-medium shadow"
                  >
                    <Pencil className="w-4 h-4" /> Reschedule
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-6 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex gap-2 items-center font-medium shadow"
                  >
                    <Trash2 className="w-4 h-4" /> Cancel Appointment
                  </button>
                </>
              )}
              {isPast && !isCancelled && (
                <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-xl text-sm text-gray-600">
                  <AlertCircle className="w-4 h-4" />
                  This appointment has already occurred.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
      >
        <div className="space-y-4">
          {CANCEL_REASONS.map((r) => (
            <label key={r} className="flex gap-2 items-center">
              <input
                type="radio"
                checked={cancelReason === r}
                onChange={() => setCancelReason(r)}
              />
              {r}
            </label>
          ))}
          {cancelReason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full p-3 border rounded-xl"
              rows={3}
              placeholder="Specify reason"
            />
          )}
          <button
            onClick={performCancel}
            className="w-full bg-red-600 text-white py-2 rounded-xl font-semibold shadow"
          >
            Confirm Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
