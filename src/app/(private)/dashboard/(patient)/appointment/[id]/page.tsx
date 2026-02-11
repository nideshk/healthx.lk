'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DateTime } from "luxon";
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Stethoscope,
  CreditCard,
  FileText,
  ShieldCheck,
  Download,
  Share2,
  Hash,
  RefreshCcw,
  Video,
  X,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";

const CANCEL_REASONS = [
  "Schedule conflict",
  "Feeling better",
  "Booked by mistake",
  "Doctor unavailable",
  "Financial reasons",
  "Other",
];

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cancellation States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const fetchAppointment = useCallback(async () => {
    try {
      const res = await authFetch(`/api/booking/appointment/${params.id}`);
      if (!res.ok) throw new Error(`Failed to load appointment`);
      const data = await res.json();
      setAppointment(data);
    } catch (err) {
      toast.error("Failed to load appointment");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) fetchAppointment();
  }, [params.id, fetchAppointment]);

  const handleShare = useCallback(async () => {
    const date = DateTime.fromISO(appointment.starts_at).toFormat("EEEE, dd MMMM yyyy");
    const time = DateTime.fromISO(appointment.starts_at).toFormat("hh:mm a");
    const shareText = `Appointment Summary:\n🩺 Dr. ${appointment.practitioner.full_name}\n📅 ${date}\n⏰ ${time}\nStatus: Confirmed`;

    if (navigator.share) {
      try { await navigator.share({ title: 'Appointment Details', text: shareText }); } catch (err) { }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Summary copied to clipboard");
    }
  }, [appointment]);

  const submitCancellation = async () => {
    const reason = cancelReason === "Other" ? customReason : cancelReason;
    if (!reason) return toast.error("Please select a reason");

    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/booking/appointment/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appointment cancelled");
      setShowCancelModal(false);
      fetchAppointment(); // Refresh data
    } catch {
      toast.error("Cancellation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FBFDFF]"><Loader size="lg" /></div>;
  if (!appointment) return <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">Appointment not found</div>;

  const start = DateTime.fromISO(appointment.starts_at);
  const end = DateTime.fromISO(appointment.ends_at);
  const now = DateTime.now();

  const canJoin = appointment.status === "confirmed" && now >= start.minus({ minutes: 15 }) && now <= end.plus({ minutes: 30 });
  const canCancel = appointment.status !== "cancelled" && now < start;

  return (
    <div className="min-h-screen bg-[#FBFDFF] pb-12">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-all font-bold text-xs uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center gap-4">
            <button onClick={handleShare} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100">
              <Share2 className="w-3.5 h-3.5" /> Share Summary
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-teal-500" /> HIPAA Secure
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            {/* HEADER CARD */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
              <div className={`px-8 py-3 flex justify-between items-center ${appointment.status === 'cancelled' ? 'bg-rose-600' : 'bg-teal-600'}`}>
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Consultation {appointment.status}
                </span>
                <span className="text-white text-[10px] font-bold opacity-80 uppercase tracking-widest">ID: {appointment.id.split('-')[0]}</span>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 ring-8 ring-slate-50/50 overflow-hidden">
                    {appointment.practitioner.profile_picture_url ? (
                      <img src={appointment.practitioner.profile_picture_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-2xl font-black text-slate-300">{appointment.practitioner.full_name[0]}</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-teal-500" />
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Medical Specialist</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                      Dr. {appointment.practitioner.full_name}
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-wide italic">
                      {appointment.practitioner.specialization?.join(" • ")}
                    </p>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 border-t border-slate-50 pt-8">
                      <DataPoint icon={<Calendar className="w-4 h-4" />} label="Date" value={start.toFormat("EEEE, dd MMMM yyyy")} />
                      <DataPoint icon={<Clock className="w-4 h-4" />} label="Time Slot" value={`${start.toFormat("hh:mm a")} - ${end.toFormat("hh:mm a")}`} />
                      <DataPoint icon={<Hash className="w-4 h-4" />} label="Session Type" value={appointment.appointment_type.name} />
                      <DataPoint icon={<CheckCircle2 className="w-4 h-4" />} label="Duration" value={`${appointment.appointment_type.duration_mins} Minutes`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* INTAKE INFO */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                <FileText className="w-4 h-4 text-teal-500" /> Intake Information
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Primary Concern</label>
                  <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                    <p className="text-sm text-slate-700 leading-relaxed font-semibold italic">
                      "{appointment.notes?.raw_payload?.note?.concern || "No clinical concern provided."}"
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DataPoint icon={<AlertCircle className="w-4 h-4" />} label="Expected Outcome" value={appointment.notes?.raw_payload?.note?.outcome || "Not specified"} />
                  <DataPoint icon={<Share2 className="w-4 h-4" />} label="Referral" value={appointment.notes?.raw_payload?.referral || "Direct"} />
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* JOIN ACTION CARD */}
            {canJoin && (
              <section className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl shadow-slate-200 ring-8 ring-slate-100">
                <button
                  onClick={() => router.push(`/meeting?room=${appointment.room_key}`)}
                  className="w-full py-6 bg-teal-500 hover:bg-teal-400 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all group"
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Join Consultation
                </button>
              </section>
            )}

            {/* BILLING CARD */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 rotate-12 translate-x-4 -translate-y-4 opacity-[0.03] text-teal-900 pointer-events-none">
                <CreditCard size={120} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Billing Summary
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</span>
                  <span className="text-2xl font-black text-slate-900">
                    {appointment.currency} {appointment.fee_charged.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-teal-50 rounded-2xl border border-teal-100">
                  <span className="text-[10px] font-black text-teal-700 uppercase">Payment Status</span>
                  <span className="text-[10px] font-black text-teal-700 uppercase flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> {appointment.payment_status}
                  </span>
                </div>
              </div>
            </section>

            {/* CANCEL ACTION */}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-4 border-2 border-slate-100 hover:border-rose-100 hover:text-rose-600 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Cancel Appointment
              </button>
            )}

            {/* REBOOK FOOTER */}
            <section className="bg-teal-600 rounded-[2.5rem] p-8 shadow-xl shadow-teal-100 text-white group cursor-pointer" onClick={() => router.push(`/appointment`)}>
              <h4 className="font-black text-sm uppercase tracking-widest mb-1">Follow up?</h4>
              <p className="text-teal-100 text-[10px] font-medium leading-relaxed mb-4">Book another session with Dr. {appointment.practitioner.full_name.split(' ')[0]}</p>
              <div className="flex items-center justify-between font-black text-[10px] uppercase tracking-widest border-t border-white/20 pt-4">
                Schedule New <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => !isSubmitting && setShowCancelModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowCancelModal(false)} className="absolute right-6 top-6 p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Cancel Session?</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">This action cannot be undone.</p>

            <div className="space-y-3">
              {CANCEL_REASONS.map((reason) => (
                <label key={reason} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${cancelReason === reason ? 'border-teal-500 bg-teal-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                  <input type="radio" name="cancelReason" className="hidden" value={reason} checked={cancelReason === reason} onChange={(e) => setCancelReason(e.target.value)} />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${cancelReason === reason ? 'border-teal-500' : 'border-slate-300'}`}>
                    {cancelReason === reason && <div className="w-2 h-2 bg-teal-500 rounded-full" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">{reason}</span>
                </label>
              ))}
              {cancelReason === "Other" && (
                <textarea placeholder="Reason..." className="w-full border-2 border-slate-100 focus:border-teal-500 focus:ring-0 p-4 rounded-2xl text-sm mt-2 transition-all" rows={3} value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
              )}
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button disabled={isSubmitting || !cancelReason} onClick={submitCancellation} className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-rose-100">
                {isSubmitting ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DataPoint({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="mt-0.5 text-slate-300 group-hover:text-teal-500 transition-colors">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-700 leading-tight">{value}</p>
      </div>
    </div>
  );
}