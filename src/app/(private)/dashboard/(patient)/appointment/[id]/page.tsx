'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
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
  ExternalLink,
  Hash,
  RefreshCcw,
  Copy
} from "lucide-react";
import { toast } from "sonner"; // Switched to sonner for consistency with previous steps
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


  // --- Safe Sharing Feature ---
  const handleShare = useCallback(async () => {
    const date = DateTime.fromISO(appointment.starts_at).toFormat("EEEE, dd MMMM yyyy");
    const time = DateTime.fromISO(appointment.starts_at).toFormat("hh:mm a");

    // Abstracted data for sharing - NO links or IDs
    const shareText = `Appointment Summary:
🩺 Professional: Dr. ${appointment.practitioner.full_name}
📅 Date: ${date}
⏰ Time: ${time}
✅ Service: ${appointment.appointment_type.name}
Status: Confirmed via Secure Portal`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Appointment Details',
          text: shareText,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to Clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Summary copied to clipboard");
      } catch (err) {
        toast.error("Could not copy summary");
      }
    }
  }, [appointment]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FBFDFF]"><Loader size="lg" /></div>;
  if (!appointment) return <div className="p-10 text-center">Appointment not found</div>;

  const start = DateTime.fromISO(appointment.starts_at);
  const end = DateTime.fromISO(appointment.ends_at);

  return (
    <div className="min-h-screen bg-[#FBFDFF] pb-12">
      {/* 1. TOP UTILITY BAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 hover:bg-teal-50 hover:text-teal-600 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100"
            >
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

          {/* LEFT: PRIMARY DATA RECORD */}
          <div className="lg:col-span-2 space-y-6">

            {/* STATUS HEADER */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
              <div className="bg-teal-600 px-8 py-3 flex justify-between items-center">
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Consultation {appointment.status}
                </span>
                <span className="text-teal-100 text-[10px] font-bold opacity-80">Ref: {appointment.id.split('-')[0]}</span>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 overflow-hidden ring-8 ring-slate-50/50">
                      {appointment.practitioner.profile_picture_url ? (
                        <img src={appointment.practitioner.profile_picture_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-teal-500" />
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Medical Specialist</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 leading-tight">
                      Dr. {appointment.practitioner.full_name}
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1">
                      {appointment.practitioner.specialization?.join(", ")}
                    </p>

                    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 border-t border-slate-50 pt-8">
                      <DataPoint icon={<Calendar className="w-4 h-4" />} label="Date" value={start.toFormat("EEEE, dd MMMM yyyy")} />
                      <DataPoint icon={<Clock className="w-4 h-4" />} label="Time Slot" value={`${start.toFormat("hh:mm a")} - ${end.toFormat("hh:mm a")}`} />
                      <DataPoint icon={<Hash className="w-4 h-4" />} label="Session Type" value={appointment.appointment_type.name} />
                      <DataPoint icon={<CheckCircle2 className="w-4 h-4" />} label="Scheduled Duration" value={`${appointment.appointment_type.duration_mins} Minutes`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MEDICAL NOTES & ATTACHMENTS */}
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                <FileText className="w-4 h-4 text-teal-500" />
                Intake Information
              </h3>
              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Pre-Consultation Notes</label>
                  <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                      "{appointment.notes?.concern || "No additional clinical notes were provided for this specific consultation."}"
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">Patient Attachments</label>
                  {appointment.attachments.length === 0 ? (
                    <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4 opacity-50" /> No files shared
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {/* Map through attachments here */}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT: FINANCIAL & ACTIONS */}
          <div className="space-y-6">
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
                  <span className="text-[10px] font-black text-teal-700 uppercase tracking-tighter">Status</span>
                  <span className="text-[10px] font-black text-teal-700 uppercase flex items-center gap-1 bg-white px-2 py-1 rounded-md shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> {appointment.payment_status}
                  </span>
                </div>

                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 transition-all shadow-xl shadow-slate-200">
                  <Download className="w-4 h-4" /> Download Receipt
                </button>
              </div>
            </section>

            {/* REBOOK ACTION */}
            <section className="bg-teal-600 rounded-[2.5rem] p-8 shadow-xl shadow-teal-100 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
              <h4 className="font-black text-sm uppercase tracking-widest mb-2 relative z-10">Follow up needed?</h4>
              <p className="text-teal-100 text-[11px] font-medium leading-relaxed mb-6 relative z-10">
                You can easily rebook a session with Dr. {appointment.practitioner.full_name.split(' ')[0]} to discuss your progress.
              </p>
              <button
                onClick={() => router.push(`/appointment`)}
                className="w-full py-4 bg-white text-teal-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-50 transition-all active:scale-95 relative z-10"
              >
                <RefreshCcw className="w-4 h-4" /> Schedule New
              </button>
            </section>

            {/* TECHNICAL METADATA (FOOTER) */}
            <div className="px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter leading-loose">
                <span className="block border-b border-slate-100 pb-1 mb-1 font-bold">Audit Trail</span>
                ID: {appointment.id}<br />
                PRV: {appointment.practitioner.id}
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function DataPoint({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="mt-0.5 text-slate-300 group-hover:text-teal-500 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-sm font-bold text-slate-700">{value}</p>
      </div>
    </div>
  );
}