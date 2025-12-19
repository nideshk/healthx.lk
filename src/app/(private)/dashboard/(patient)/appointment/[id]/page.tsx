"use client";

import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import Modal from "@/components/atom/Modal/Modal";
import { toast } from "react-toastify";

/* ---------------- SMALL UI HELPER ---------------- */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
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
    axios
      .get(`/api/booking/appointment/${params.id}`)
      .then((res) => setAppointment(res.data))
      .catch(() => toast.error("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10">Loading…</div>;
  if (!appointment) return <div className="p-10 text-red-500">Not Found</div>;

  /* ---------------- TIME ---------------- */
  const tz = appointment.practitioner?.timezone || "Asia/Kolkata";
  const startLocal = DateTime.fromISO(appointment.starts_at).setZone(tz);
  const endLocal = DateTime.fromISO(appointment.ends_at).setZone(tz);

  const readableDate = startLocal.toFormat("EEEE, MMM dd yyyy");
  const readableTime = `${startLocal.toFormat("hh:mm a")} — ${endLocal.toFormat(
    "hh:mm a"
  )}`;

  const isPastAppointment = startLocal < DateTime.now();
  const isCancelled = appointment.status === "cancelled";
  const canReschedule =
    !isPastAppointment &&
    !isCancelled &&
    startLocal.diffNow("hours").hours >= 6;

  /* ---------------- SHARE ---------------- */
  const handleShare = async () => {
    const text = `
Appointment Details

Doctor: ${appointment.practitioner.full_name}
Specialization: ${appointment.practitioner.specialization?.join(", ") || "—"}

Date: ${readableDate}
Time: ${readableTime}

Join Link:
${appointment.telehealth_url || "Not available"}

— Clinico Telehealth
    `.trim();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Appointment Details",
          text,
          url: appointment.telehealth_url || undefined,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Appointment details copied");
      }
    } catch {
      toast.error("Unable to share appointment");
    }
  };

  /* ---------------- CANCEL ---------------- */
  async function performCancel() {
    if (!cancelReason) return toast.error("Please select a reason");

    const finalReason =
      cancelReason === "Other" ? customReason.trim() : cancelReason;

    if (cancelReason === "Other" && !finalReason) {
      return toast.error("Please enter a reason");
    }

    try {
      await axios.patch(`/api/booking/appointment/${appointment.id}`, {
        action: "cancel",
        reason: finalReason,
      });

      toast.success("Appointment cancelled");
      setShowCancelModal(false);
      router.push("/dashboard/appointment");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to cancel appointment"
      );
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">
          Appointment Details
        </h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-8">
        {/* ================= SUMMARY ================= */}
        <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Appointment Summary</h2>

            {isCancelled ? (
              <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700">
                Cancelled
              </span>
            ) : isPastAppointment ? (
              <span className="px-3 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
                Completed
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">
                Confirmed
              </span>
            )}
          </div>

          <div className="border-t" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoRow
              label="Doctor"
              value={appointment.practitioner.full_name}
            />
            <InfoRow
              label="Specialization"
              value={
                appointment.practitioner.specialization?.join(", ") || "—"
              }
            />
            <InfoRow label="Date" value={readableDate} />
            <InfoRow label="Time" value={readableTime} />
            <InfoRow
              label="Duration"
              value={`${appointment.appointment_type?.duration_mins} minutes`}
            />
            <InfoRow
              label="Mode"
              value={
                <span className="flex items-center gap-1 text-blue-600">
                  <Video className="w-4 h-4" />
                  Online
                </span>
              }
            />
          </div>

          {/* JOIN */}
          <div className="border-t pt-5 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Join Consultation
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                readOnly
                value={
                  appointment.telehealth_url ||
                  "No telehealth link available"
                }
                className="flex-1 px-4 py-2.5 text-xs border rounded-xl bg-gray-50 truncate"
              />

              <button
                disabled={isPastAppointment}
                onClick={() =>
                  window.open(appointment.telehealth_url, "_blank")
                }
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  isPastAppointment
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Join
              </button>
            </div>
          </div>
        </section>

        {/* ================= ACTIONS ================= */}
        <section className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Actions</h2>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center gap-2 font-medium"
            >
              <Share2 className="w-4 h-4" />
              Share Appointment
            </button>

            {!isPastAppointment && !isCancelled && (
              <>
                <button
                  disabled={!canReschedule}
                  onClick={() =>
                    router.push(`/dashboard/reschedule/${appointment.id}`)
                  }
                  className={`px-6 py-3 rounded-xl flex items-center gap-2 font-medium ${
                    canReschedule
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  Reschedule Appointment
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-6 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel Appointment
                </button>
              </>
            )}

            {isPastAppointment && !isCancelled && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                This appointment has already taken place.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ================= CANCEL MODAL ================= */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
        theme="light"
      >
        <div className="space-y-4">
          {CANCEL_REASONS.map((reason) => (
            <label
              key={reason}
              className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                checked={cancelReason === reason}
                onChange={() => setCancelReason(reason)}
              />
              {reason}
            </label>
          ))}

          {cancelReason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
              className="w-full p-3 border rounded-xl"
              placeholder="Please specify reason"
            />
          )}

          <button
            onClick={performCancel}
            className="w-full bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700"
          >
            Confirm Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
