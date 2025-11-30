"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Stethoscope,
  Video,
  Share2,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/atom/Modal/Modal";


export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cancel modal
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

  const canReschedule = startLocal.diffNow("hours").hours >= 6;

  /* ---------------- PRE-CONSULT ---------------- */
  const pre = appointment.notes?.raw_payload || {};
  const concern = pre?.note?.concern;
  const outcome = pre?.note?.outcome;
  const referral = pre?.referral;

  /* ---------------- CANCEL HANDLER ---------------- */
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
    router.push("/dashboard/appointments");
  } catch (err: any) {
    toast.error(
      err?.response?.data?.error || "Failed to cancel appointment"
    );
  }
}


  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="flex items-center gap-3 p-5">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xl font-semibold text-gray-900">
          Appointment Details
        </h1>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto mt-4 px-6 pb-20">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">

          {/* DOUBLE COLUMN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

            {/* LEFT COLUMN */}
            <div className="space-y-10">

              {/* Doctor */}
              <section className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Doctor</h2>
                <div className="flex items-center gap-5">
                  <img
                    src={
                      appointment.practitioner.profile_picture_url ||
                      "/images/default-doctor.png"
                    }
                    className="w-20 h-20 rounded-full border shadow-sm object-cover"
                  />

                  <div>
                    <p className="text-2xl font-semibold">
                      {appointment.practitioner.full_name}
                    </p>

                    <p className="text-gray-600 flex items-center gap-1 text-sm">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      {appointment.practitioner.specialization?.join(", ")}
                    </p>
                  </div>
                </div>
              </section>

              {/* Pre-consultation */}
              {(concern || outcome || referral) && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pre-Consultation Notes
                  </h2>
                  <div className="space-y-2 text-gray-700">
                    {concern && (
                      <p>
                        <span className="font-medium">Concern:</span> {concern}
                      </p>
                    )}
                    {outcome && (
                      <p>
                        <span className="font-medium">Expected Outcome:</span>{" "}
                        {outcome}
                      </p>
                    )}
                    {referral && (
                      <p>
                        <span className="font-medium">Referral:</span> {referral}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Billing */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">Billing</h2>

                <p className="text-gray-800">
                  <span className="font-medium">Fee:</span> {appointment.currency}{" "}
                  {appointment.fee_charged}
                </p>

                <p className="flex items-center gap-2">
                  <span className="font-medium">Payment Status:</span>

                  {appointment.payment_status === "completed" && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      Completed
                    </span>
                  )}
                  {appointment.payment_status === "pending" && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                      Pending
                    </span>
                  )}
                  {appointment.payment_status === "failed" && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      Failed
                    </span>
                  )}
                </p>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-10">

              {/* Appointment Info */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Appointment
                </h2>

                <p className="text-lg text-gray-800">{readableDate}</p>

                <p className="text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  {readableTime}
                </p>

                <p className="text-sm text-gray-500">
                  Duration: {appointment.appointment_type?.duration_mins} mins
                </p>

                {appointment.cancellation && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Cancelled</p>
                      <p className="text-sm">{appointment.cancellation.reason}</p>
                    </div>
                  </div>
                )}
              </section>
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Actions
                </h2>

                <div className="flex flex-col gap-3">
                  {appointment.status !== "cancelled" && 
                  <>
                  <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-2 font-medium text-gray-700">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>

                  <button
                    disabled={!canReschedule}
                    onClick={() =>
                      router.push(`/dashboard/reschedule/${appointment.id}`)
                    }
                    className={`px-6 py-3 rounded-xl flex items-center gap-2 font-medium ${
                      canReschedule
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    >
                    <Pencil className="w-4 h-4" />
                    Reschedule
                  </button>
                      </> 
                  }

                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-6 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel Appointment
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* Mobile Join */}
          <div className="mt-10 md:hidden">
            <button
              disabled={!appointment.telehealth_url}
              onClick={() =>
                window.open(appointment.telehealth_url, "_blank")
              }
              className="w-full px-5 py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 disabled:bg-gray-300"
            >
              <Video className="w-4 h-4" />
              Join Consultation
            </button>
          </div>
        </div>
      </div>

      {/* CANCEL MODAL */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Appointment"
        theme="light"
        maxHeight="85vh"
        footer={
          <>
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
            <button
              onClick={performCancel}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Confirm Cancel
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-gray-700">
            Please tell us why you want to cancel this appointment:
          </p>

          <div className="space-y-3">
            {CANCEL_REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="cancelReason"
                  value={reason}
                  checked={cancelReason === reason}
                  onChange={() => setCancelReason(reason)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-800">{reason}</span>
              </label>
            ))}
          </div>

          {cancelReason === "Other" && (
            <textarea
              placeholder="Please enter your reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={4}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
