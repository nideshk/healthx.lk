"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Appointment, Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import { Card, CardBody } from "@/components/atom/Card/Card";
import { FileText, ExternalLink, Pill, Calendar, User, Plus, ArrowLeft, Trash2, Save, Send, Loader2, Search } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";

export interface MedicineItem {
    medicine_name: string;
    strength: string;
    route: string;
    duration: string;
}

export interface PrescriptionDetails {
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
    viewMode = "both",
    standalonePrescription
}: {
    appointments: Appointment[];
    patient: Patient;
    viewMode?: "builder" | "history" | "standalone" | "both";
    standalonePrescription?: PrescriptionDetails;
}) {
    const [prescriptions, setPrescriptions] = useState<PrescriptionDetails[]>([]);
    const [loading, setLoading] = useState(true);

    const validAppointments = useMemo(() => {
        return appointments
            .filter(a =>
                ["confirmed", "completed", "ongoing", "scheduled"].includes(a.status?.toLowerCase() || "")
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments]);

    /* ---------------------------------------------------------
       History Fetching (UPDATED)
    --------------------------------------------------------- */
    const fetchHistory = async () => {
        setLoading(true);
        const history: PrescriptionDetails[] = [];

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
                            // ✅ NEW LOGIC (priority-based)
                            const diagnosisText =
                                data.diagnoses?.map((d: any) => d.diagnoses?.name).join(", ") || // NEW
                                data.prescription?.diagnosis_snapshot?.name ||                  // SNAPSHOT
                                data.prescription?.diagnosis ||                                 // OLD
                                data.encounter?.diagnosis ||                                    // VERY OLD
                                "No diagnosis provided";

                            history.push({
                                id: data.prescription.id,
                                diagnosis: diagnosisText,
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
       Builder State (UPDATED)
    --------------------------------------------------------- */
    const [showBuilder, setShowBuilder] = useState(false);
    const [saving, setSaving] = useState(false);
    const [builderData, setBuilderData] = useState({
        appointmentId: "",
        diagnosis: "",
        diagnosis_code: "",
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

    // Helper to render a prescription card
    const renderPrescriptionCard = (px: PrescriptionDetails) => (
        <Card key={px.id}>
            <CardBody>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500">{px.appointment_date}</p>
                        <p className="text-sm font-semibold text-slate-900">Dr. {px.practitioner_name}</p>
                    </div>
                    <span className={`inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full self-start ${
                        px.status === 'issued' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                        {px.status}
                    </span>
                </div>

                <div className="mt-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Diagnosis</p>
                    <p className="text-sm italic text-slate-700">{px.diagnosis || "—"}</p>
                </div>

                <div className="mt-4 space-y-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Medicines</p>
                    {px.items.map((med, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <Pill size={12} className="text-blue-500" />
                            <span className="font-semibold text-slate-800">{med.medicine_name}</span>
                            <span className="text-slate-500">• {med.strength}</span>
                            <span className="text-slate-500">• {med.route}</span>
                            <span className="text-slate-500">• {med.duration}</span>
                        </div>
                    ))}
                </div>

                {px.notes && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Special Notes</p>
                        <p className="text-xs text-slate-600 italic">"{px.notes}"</p>
                    </div>
                )}
            </CardBody>
        </Card>
    );

    /* ---------------------------------------------------------
       Diagnosis Search (NEW)
    --------------------------------------------------------- */
    const [diagSearchText, setDiagSearchText] = useState("");
    const [diagSearchResults, setDiagSearchResults] = useState<any[]>([]);
    const [isSearchingDiag, setIsSearchingDiag] = useState(false);
    const [showDiagDropdown, setShowDiagDropdown] = useState(false);
    const searchRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDiagDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!diagSearchText || diagSearchText.length < 2) {
            setDiagSearchResults([]);
            setShowDiagDropdown(false);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingDiag(true);
            try {
                const res = await authFetch(`/api/diagnoses/search?q=${encodeURIComponent(diagSearchText)}`);
                if (res.ok) {
                    const json = await res.json();
                    setDiagSearchResults(json.data || []);
                    setShowDiagDropdown(true);
                } else {
                    setDiagSearchResults([]);
                }
            } catch (err) {
                console.error("Search error", err);
            } finally {
                setIsSearchingDiag(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [diagSearchText]);

    const selectDiagnosis = (diag: any) => {
        setBuilderData(prev => ({
            ...prev,
            diagnosis: diag.name || "",
            diagnosis_code: diag.code || ""
        }));
        setDiagSearchText("");
        setShowDiagDropdown(false);
    };

    const handleIssue = async (shouldIssue: boolean) => {
        if (!builderData.appointmentId) {
            toast.error("Please select an appointment.");
            return;
        }
        if (shouldIssue && builderData.items.length === 0) {
            toast.error("Add at least one medicine before issuing.");
            return;
        }

        setSaving(true);
        try {
            const status = shouldIssue ? "issued" : "draft";
            const res = await authFetch(
                `/api/booking/appointment/${builderData.appointmentId}/consultation`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        diagnosis_code: builderData.diagnosis_code || null,
                        diagnosis: builderData.diagnosis || null,
                        prescription_items: builderData.items.filter(
                            (i) => i.medicine_name.trim()
                        ),
                        special_notes: builderData.notes || null,
                        status,
                    }),
                }
            );

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error || "Failed to save prescription");
            }

            toast.success(shouldIssue ? "Prescription issued successfully" : "Draft saved");

            setShowBuilder(false);
            setBuilderData({ appointmentId: "", diagnosis: "", diagnosis_code: "", notes: "", items: [] });
            fetchHistory();

        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------------------------------------------------
       UI (unchanged mostly)
    --------------------------------------------------------- */

    if (loading && prescriptions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader size="lg" />
                <p className="text-sm text-slate-500">Loading prescription history...</p>
            </div>
        );
    }

    if (viewMode === "standalone" && standalonePrescription) {
        return renderPrescriptionCard(standalonePrescription);
    }

    if (viewMode === "builder" || (viewMode === "both" && showBuilder)) {
        return (
            <div className="space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        {viewMode === "both" && (
                            <button 
                                onClick={() => setShowBuilder(false)} 
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">New Prescription</h3>
                            <p className="text-xs text-slate-500">Create and issue a digital prescription for the selected patient.</p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Patient Name</span>
                        <span className="text-sm font-bold text-blue-900">{patient.full_name}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Section 1: Clinical Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        {/* Appointment Selector */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <Calendar size={12} /> Select Appointment
                            </label>
                            <select
                                value={builderData.appointmentId}
                                onChange={e => setBuilderData(prev => ({ ...prev, appointmentId: e.target.value }))}
                                className="w-full text-sm p-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                            >
                                <option value="">-- Choose session --</option>
                                {validAppointments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {new Date(a.date).toLocaleDateString()} - {a.time}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Search Diagnosis */}
                        <div className="space-y-2 relative" ref={searchRef}>
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <Search size={12} /> Diagnosis
                            </label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={diagSearchText}
                                    onChange={e => setDiagSearchText(e.target.value)}
                                    onFocus={() => { if (diagSearchResults.length > 0) setShowDiagDropdown(true); }}
                                    placeholder="Search by name or code..."
                                    className="w-full text-sm pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                {isSearchingDiag && <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                            </div>
                            {showDiagDropdown && (
                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-200 mt-2 max-h-64 overflow-auto animate-in fade-in zoom-in-95 duration-200">
                                    {diagSearchResults.length === 0 && !isSearchingDiag ? (
                                        <li className="px-5 py-4 text-sm text-slate-400 italic">No results found</li>
                                    ) : (
                                        diagSearchResults.map((result) => (
                                            <li
                                                key={result.id}
                                                onClick={() => selectDiagnosis(result)}
                                                className="px-5 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-blue-600 group-hover:text-blue-700">{result.code}</span>
                                                    <span className="text-xs text-slate-400">ICD-10</span>
                                                </div>
                                                <p className="text-sm text-slate-700 mt-0.5">{result.name}</p>
                                            </li>
                                        ))
                                    )}
                                </ul>
                            )}
                            
                            {/* Selected Diagnosis Badge */}
                            {builderData.diagnosis && (
                                <div className="mt-2 flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                            {builderData.diagnosis_code}
                                        </div>
                                        <span className="text-sm font-medium text-blue-900 truncate max-w-[200px]">{builderData.diagnosis}</span>
                                    </div>
                                    <button 
                                        onClick={() => setBuilderData(prev => ({ ...prev, diagnosis: "", diagnosis_code: "" }))} 
                                        className="text-blue-400 hover:text-blue-600 p-1"
                                    >
                                        <ArrowLeft size={16} className="rotate-180" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Medications */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Pill size={18} className="text-blue-500" /> Medications
                                </h4>
                                <p className="text-xs text-slate-500">List all prescribed medicines, dosage, and intake route.</p>
                            </div>
                            <button 
                                onClick={addMedicine} 
                                className="group px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-slate-200 active:scale-95"
                            >
                                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> Add New Medicine
                            </button>
                        </div>

                        <div className="space-y-4">
                            {builderData.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                        <Pill size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-400">No medicines added yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Click "Add New Medicine" to begin</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {builderData.items.map((item, idx) => (
                                        <div key={idx} className="group p-6 bg-white border border-slate-200 rounded-3xl relative transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5">
                                            <button 
                                                onClick={() => removeMedicine(idx)} 
                                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Remove medicine"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                                <div className="lg:col-span-5 space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Medicine Name</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.medicine_name} 
                                                        onChange={e => updateMedicine(idx, 'medicine_name', e.target.value)} 
                                                        className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                                                        placeholder="e.g. Paracetamol" 
                                                    />
                                                </div>
                                                <div className="lg:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Strength</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.strength} 
                                                        onChange={e => updateMedicine(idx, 'strength', e.target.value)} 
                                                        className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                                                        placeholder="e.g. 500mg" 
                                                    />
                                                </div>
                                                <div className="lg:col-span-3 space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Route</label>
                                                    <select 
                                                        value={item.route} 
                                                        onChange={e => updateMedicine(idx, 'route', e.target.value)} 
                                                        className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                                                    >
                                                        <option value="Oral">Oral (Tablet/Liquid)</option>
                                                        <option value="IV">IV (Intravenous)</option>
                                                        <option value="Local">Local (Topical/Drop)</option>
                                                        <option value="IM">IM (Intramuscular)</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="lg:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duration</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.duration} 
                                                        onChange={e => updateMedicine(idx, 'duration', e.target.value)} 
                                                        className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                                                        placeholder="e.g. 5 days" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 3: Extra Info */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            <FileText size={16} className="text-slate-400" /> Directions to Patient & Notes
                        </label>
                        <textarea 
                            rows={3} 
                            value={builderData.notes} 
                            onChange={e => setBuilderData(prev => ({ ...prev, notes: e.target.value }))} 
                            className="w-full text-sm p-4 bg-slate-50 border border-slate-200 rounded-3xl shadow-inner focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
                            placeholder="Provide any additional instructions, e.g. 'Take after food', 'Avoid driving'..."
                        ></textarea>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4">
                        <button 
                            onClick={() => handleIssue(false)} 
                            disabled={saving} 
                            className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 shadow-sm"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save as Draft
                        </button>
                        <button 
                            onClick={() => handleIssue(true)} 
                            disabled={saving} 
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="shrink-0" />} 
                            <span className="leading-none">Issue Prescription</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            {viewMode !== "history" && (
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-900">Prescription History</h3>
                    <button
                        onClick={() => setShowBuilder(true)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                        Create New
                    </button>
                </div>
            )}

            {/* List */}
            {prescriptions.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-6">No prescriptions found</div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {prescriptions.map(px => renderPrescriptionCard(px))}
                </div>
            )}
        </div>
    );
}
