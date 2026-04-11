"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Appointment, Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import { Card, CardBody } from "@/components/atom/Card/Card";
import { FileText, ExternalLink, Pill, Calendar, User, Plus, ArrowLeft, Trash2, Save, Send } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";

interface MedicineItem {
    medicine_name: string;
    strength: string;
    route: string;
    duration: string;
}

interface PrescriptionDetails {
    id: string;
    diagnosis: string;
    items: MedicineItem[];
    notes: string;
    status: "draft" | "issued";
    created_at: string;
    appointment_date: string;
    practitioner_name: string;
}

export default function PrescriptionTab({
    appointments,
    patient,
}: {
    appointments: Appointment[];
    patient: Patient;
}) {
    const [prescriptions, setPrescriptions] = useState<PrescriptionDetails[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter appointments that could have a prescription attached
    const validAppointments = useMemo(() => {
        return appointments.filter(a =>
            ["confirmed", "completed", "ongoing", "scheduled"].includes(a.status?.toLowerCase() || "")
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments]);

    /* ---------------------------------------------------------
       History Fetching
    --------------------------------------------------------- */
    const fetchHistory = async () => {
        setLoading(true);
        const history: PrescriptionDetails[] = [];

        // Only iterate through potentially relevant appointments
        const completedAppointments = appointments.filter(
            (a) => a.status === "completed" || a.status === "confirmed"
        );

        try {
            await Promise.all(
                completedAppointments.map(async (appt) => {
                    try {
                        const res = await authFetch(
                            `/api/booking/appointment/${appt.id}/consultation`
                        );
                        if (!res.ok) return;

                        const data = await res.json();
                        if (data.prescription) {
                            history.push({
                                id: data.prescription.id,
                                diagnosis: data.prescription.diagnosis || data.encounter?.diagnosis || "No diagnosis provided",
                                items: data.prescription.items || [],
                                notes: data.prescription.notes || "",
                                status: data.prescription.status || "draft",
                                created_at: data.prescription.created_at,
                                appointment_date: appt.date,
                                practitioner_name: appt.doctorName || "Clinician",
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to fetch prescription for ${appt.id}`, err);
                    }
                })
            );

            history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setPrescriptions(history);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (appointments.length > 0) {
            fetchHistory();
        } else {
            setLoading(false);
        }
    }, [appointments]);

    /* ---------------------------------------------------------
       Creation State & Logic
    --------------------------------------------------------- */
    const [showBuilder, setShowBuilder] = useState(false);
    const [saving, setSaving] = useState(false);
    const [builderData, setBuilderData] = useState({
        appointmentId: "",
        diagnosis: "",
        notes: "",
        items: [] as MedicineItem[]
    });

    const addMedicine = () => {
        setBuilderData(prev => ({
            ...prev,
            items: [...prev.items, { medicine_name: "", strength: "", route: "Oral", duration: "" }]
        }));
    };

    const removeMedicine = (idx: number) => {
        setBuilderData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const updateMedicine = (idx: number, field: keyof MedicineItem, val: string) => {
        const newItems = [...builderData.items];
        newItems[idx] = { ...newItems[idx], [field]: val };
        setBuilderData(prev => ({ ...prev, items: newItems }));
    };

    const handleIssue = async (shouldIssue: boolean) => {
        if (!builderData.appointmentId) {
            toast.error("Please select an appointment to link this prescription.");
            return;
        }
        if (builderData.items.length === 0) {
            toast.error("Please add at least one medicine.");
            return;
        }

        setSaving(true);
        try {
            // 1. Create prescription meta
            const metaRes = await authFetch("/api/prescriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointment_id: builderData.appointmentId,
                    diagnosis: builderData.diagnosis,
                    notes: builderData.notes
                })
            });

            if (!metaRes.ok) throw new Error("Failed to create prescription metadata");
            const meta = await metaRes.json();
            const pxId = meta.id;

            // 2. Add items
            const itemsRes = await authFetch(`/api/prescriptions/${pxId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: builderData.items })
            });
            if (!itemsRes.ok) throw new Error("Failed to add medicines to prescription");

            // 3. Issue if requested
            if (shouldIssue) {
                const issueRes = await authFetch(`/api/prescriptions/${pxId}/issue`, { method: "POST" });
                if (!issueRes.ok) throw new Error("Prescription created but failed to issue.");
                toast.success("Prescription issued successfully!");
            } else {
                toast.success("Prescription draft saved.");
            }

            setShowBuilder(false);
            setBuilderData({ appointmentId: "", diagnosis: "", notes: "", items: [] });
            fetchHistory();
        } catch (err: any) {
            toast.error(err.message || "Failed to save prescription");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------------------------------------------------
       Render Helpers
    --------------------------------------------------------- */
    if (loading && prescriptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader size="lg" />
                <p className="text-sm text-slate-500 animate-pulse">Aggregating prescription history...</p>
            </div>
        );
    }

    if (showBuilder) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowBuilder(false)}
                        className="p-2 rounded-full hover:bg-slate-100 transition text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">New Prescription</h3>
                        <p className="text-xs text-slate-500">Creating for {patient.full_name}</p>
                    </div>
                </div>

                <div className="space-y-4 max-w-2xl">
                    {/* Link to Appointment */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Associated Appointment
                        </label>
                        <select
                            value={builderData.appointmentId}
                            onChange={(e) => setBuilderData(prev => ({ ...prev, appointmentId: e.target.value }))}
                            className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        >
                            <option value="">Select an appointment date...</option>
                            {validAppointments.map(appt => (
                                <option key={appt.id} value={appt.id}>
                                    {appt.date} - {appt.appointmentType || appt.reason || "Consultation"} ({appt.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Diagnosis */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis</label>
                        <textarea
                            placeholder="Enter formal diagnosis..."
                            value={builderData.diagnosis}
                            onChange={(e) => setBuilderData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            className="w-full min-h-[80px] text-sm p-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Items */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicines</label>
                            <button
                                onClick={addMedicine}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold hover:bg-blue-100 transition"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        {builderData.items.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 italic text-xs">
                                No medicines added yet.
                            </div>
                        )}

                        <div className="space-y-3">
                            {builderData.items.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 relative group shadow-sm transition-all hover:bg-white">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Medicine Name</span>
                                            <input
                                                type="text"
                                                placeholder="e.g. Paracetamol"
                                                value={item.medicine_name}
                                                onChange={(e) => updateMedicine(idx, "medicine_name", e.target.value)}
                                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition"
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Strength</span>
                                            <input
                                                type="text"
                                                placeholder="e.g. 500mg"
                                                value={item.strength}
                                                onChange={(e) => updateMedicine(idx, "strength", e.target.value)}
                                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition"
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Route</span>
                                            <select
                                                value={item.route}
                                                onChange={(e) => updateMedicine(idx, "route", e.target.value)}
                                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition"
                                            >
                                                <option value="Oral">Oral</option>
                                                <option value="IV">IV</option>
                                                <option value="Local">Local</option>
                                                <option value="Suppository">Suppository</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                                            <input
                                                type="text"
                                                placeholder="e.g. 7 days"
                                                value={item.duration}
                                                onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 transition"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeMedicine(idx)}
                                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-50 text-red-500 border border-red-100 opacity-0 group-hover:opacity-100 transition shadow-sm"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pharmacy Notes */}
                    <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pharmacy Instructions</label>
                        <textarea
                            placeholder="Any special instructions for the pharmacist..."
                            value={builderData.notes}
                            onChange={(e) => setBuilderData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full min-h-[100px] text-sm p-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-6 border-t border-slate-100 mt-8">
                        <button
                            disabled={saving}
                            onClick={() => handleIssue(false)}
                            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
                        >
                            <Save size={18} /> Save as Draft
                        </button>
                        <button
                            disabled={saving}
                            onClick={() => handleIssue(true)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <Loader size="sm" /> : <><Send size={18} /> Issue Prescription</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        Prescription History
                    </h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                        {prescriptions.length} Records
                    </span>
                    <button
                        onClick={() => setShowBuilder(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition active:scale-95"
                    >
                        <Plus size={14} /> Create New
                    </button>
                </div>
            </div>

            {prescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <Pill size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">No Prescriptions Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-[240px] text-center">
                        Select "Create New" to issue a prescription for this patient.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {prescriptions.map((px) => (
                        <Card key={px.id} className="overflow-hidden border-slate-200 hover:border-blue-300 transition-colors shadow-sm">
                            <CardBody className="p-0">
                                {/* Header */}
                                <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Calendar size={12} />
                                            {px.appointment_date}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                            <User size={14} className="text-blue-600" />
                                            Dr. {px.practitioner_name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${px.status === "issued"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {px.status}
                                        </span>
                                        <a
                                            href={`/api/prescriptions/${px.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition"
                                            title="View Original"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4 space-y-4">
                                    {/* Diagnosis */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Diagnosis</h4>
                                        <p className="text-xs text-slate-800 leading-relaxed italic border-l-2 border-blue-200 pl-3">
                                            {px.diagnosis}
                                        </p>
                                    </div>

                                    {/* Medicines */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Medicines</h4>
                                        <div className="space-y-2">
                                            {px.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/30 border border-blue-100/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-900">{item.medicine_name}</span>
                                                        <span className="text-[10px] text-slate-500">{item.strength} • {item.route}</span>
                                                    </div>
                                                    <div className="text-[10px] font-semibold text-blue-700 bg-blue-100/50 px-2 py-1 rounded-md">
                                                        {item.duration}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Patient Notes */}
                                    {px.notes && (
                                        <div className="mt-4 pt-4 border-t border-slate-50">
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Pharmacy Instructions</h4>
                                            <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                {px.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

