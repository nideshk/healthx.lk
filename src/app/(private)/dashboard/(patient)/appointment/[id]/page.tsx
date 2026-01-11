"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "react-toastify";
import Loader from "@/components/atom/Loader/Loader";

export default function AppointmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`/api/booking/appointment/${params.id}`)
      .then((res) => setAppointment(res.data))
      .catch(() => toast.error("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader size="lg" /></div>;
  if (!appointment) return <div className="p-10 text-center">Appointment not found</div>;

  const start = DateTime.fromISO(appointment.starts_at);
  const end = DateTime.fromISO(appointment.ends_at);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 1. TOP UTILITY BAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600"><Share2 className="w-4 h-4" /></button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Encrypted Session
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: PRIMARY DATA RECORD */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* STATUS HEADER */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-emerald-600 px-6 py-2 flex justify-between items-center">
                <span className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Consultation {appointment.status}
                </span>
                <span className="text-emerald-100 text-[10px] font-medium">Ref: {appointment.id.split('-')[0]}</span>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                    {appointment.practitioner.profile_picture_url ? (
                      <img src={appointment.practitioner.profile_picture_url} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">Medical Professional</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">
                      Dr. {appointment.practitioner.full_name}
                    </h1>
                    <p className="text-slate-500 font-medium capitalize mt-1">
                      {appointment.practitioner.specialization?.join(", ")}
                    </p>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <DataPoint icon={<Calendar />} label="Date" value={start.toFormat("EEEE, dd MMMM yyyy")} />
                      <DataPoint icon={<Clock />} label="Time Slot" value={`${start.toFormat("hh:mm a")} - ${end.toFormat("hh:mm a")}`} />
                      <DataPoint icon={<Hash />} label="Service" value={appointment.appointment_type.name} />
                      <DataPoint icon={<CheckCircle2 />} label="Duration" value={`${appointment.appointment_type.duration_mins} Minutes`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MEDICAL NOTES & ATTACHMENTS */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2 border-b pb-4">
                <FileText className="w-4 h-4 text-slate-400" /> Consultation Intake & Attachments
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Notes</label>
                  <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      {appointment.notes || "No additional clinical notes were provided for this specific consultation."}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Uploaded Documents</label>
                  {appointment.attachments.length === 0 ? (
                    <div className="mt-3 flex items-center gap-2 text-slate-400 text-xs">
                       <ShieldCheck className="w-4 h-4" /> No files attached to this record.
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-2">
                       {/* Map through attachments here */}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT: FINANCIAL & ACTIONS */}
          <div className="space-y-6">
            {/* BILLING CARD */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2">
                 <div className="rotate-12 translate-x-4 -translate-y-1 opacity-[0.03]">
                    <CreditCard size={80} />
                 </div>
              </div>
              
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" /> Payment Confirmation
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-slate-500">Total Fee Paid</span>
                  <span className="text-xl font-black text-slate-900">
                    {appointment.currency} {appointment.fee_charged.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Transaction Status</span>
                  <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {appointment.payment_status}
                  </span>
                </div>

                <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Get Receipt (PDF)
                </button>
              </div>
            </section>

            {/* REBOOK ACTION */}
            <section className="bg-blue-600 rounded-2xl p-6 shadow-lg shadow-blue-100 text-white">
              <h4 className="font-bold text-sm mb-2">Need a follow up?</h4>
              <p className="text-blue-100 text-[11px] leading-relaxed mb-4">
                You can book another Quick Consultation with Dr. {appointment.practitioner.full_name.split(' ')[0]} if you have further questions.
              </p>
              <button 
                onClick={() => router.push(`/book/${appointment.practitioner.id}`)}
                className="w-full py-3 bg-white text-blue-600 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Book Again
              </button>
            </section>

            {/* TECHNICAL METADATA */}
            <div className="px-2">
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter leading-tight">
                Unique ID: {appointment.id}<br/>
                Type ID: {appointment.appointment_type.id}<br/>
                Provider ID: {appointment.practitioner.id}
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

/* --- REUSABLE DATA ROW --- */
function DataPoint({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-slate-300">
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}