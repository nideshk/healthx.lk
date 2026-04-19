"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Appointment, Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import { Card, CardBody } from "@/components/atom/Card/Card";
import { FileText, ExternalLink, Pill, Calendar, User, Plus, ArrowLeft, Trash2, Save, Send, Loader2, Search } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";

/* -------------------- SHARED TYPES -------------------- */
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

/* -------------------- COMPONENT -------------------- */
export default function PrescriptionTab({
    appointments,
    patient,
    viewMode = "both",
    standalonePrescription = null
}: {
    appointments: Appointment[];
    patient: Patient;
    viewMode?: "builder" | "history" | "both" | "standalone";
    standalonePrescription?: PrescriptionDetails | null;
}) {
    const [prescriptions, setPrescriptions] = useState<PrescriptionDetails[]>([]);
    const [loading, setLoading] = useState(viewMode !== "standalone");
    const [showBuilder, setShowBuilder] = useState(viewMode === "builder");

    const validAppointments = useMemo(() => {
        return appointments
            .filter(a =>
                ["confirmed", "completed", "ongoing", "scheduled"].includes(a.status?.toLowerCase() || "")
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments]);

    /* ---------------------------------------------------------
       History Fetching
    --------------------------------------------------------- */
    const fetchHistory = async () => {
        if (viewMode === "standalone" || viewMode === "builder") {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        const history: PrescriptionDetails[] = [];

        const completedAppointments = appointments.filter(
            (a) => a.status === "completed" || a.status === "confirmed" || a.status === "scheduled" || a.status === "ongoing"
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
                            const diagnosisText =
                                data.diagnoses?.map((d: any) => d.diagnoses?.name).join(", ") || 
                                data.prescription?.diagnosis_snapshot?.name ||                  
                                data.prescription?.diagnosis ||                                 
                                data.encounter?.diagnosis ||                                    
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
        if (viewMode !== "standalone") {
            fetchHistory();
        }
    }, [appointments, viewMode]);

    /* ---------------------------------------------------------
       Builder State & Logic
    --------------------------------------------------------- */
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

    /* ---------------------------------------------------------
       Diagnosis Search
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
                        prescription_items: builderData.items.filter((i) => i.medicine_name.trim()),
                        special_notes: builderData.notes || null,
                        status,
                    }),
                }
            );

            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Failed to save prescription");

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

    /* -------------------- RENDER MODES -------------------- */

    // 1. STANDALONE MODE
    if (viewMode === "standalone" && standalonePrescription) {
        const px = standalonePrescription;
        return (
            <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-blue-50">
                        <FileText size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-grow">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest leading-none">Diagnosis</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${px.status === "issued" ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                                {px.status}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{px.diagnosis}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    {px.items.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-slate-50 rounded-lg">
                                    <Pill size={14} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{m.medicine_name} <span className="text-slate-400 font-medium">— {m.strength}</span></p>
                                    <div className="flex gap-2 text-[10px] text-slate-500 font-medium">
                                        <span className="capitalize">{m.route}</span>
                                        <span>•</span>
                                        <span>{m.duration}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {px.items.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No medicines listed</p>}
                </div>
                
                {px.notes && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 leading-none">Special Instructions</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{px.notes}</p>
                    </div>
                )}
            </div>
        );
    }

    // 2. BUILDER MODE
    if (viewMode === "builder" || (viewMode === "both" && showBuilder)) {
        return (
            <div className="space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
                
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                        {viewMode === "both" && (
                            <button onClick={() => setShowBuilder(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">New Prescription</h3>
                            <p className="text-xs text-slate-500">Create and issue a digital prescription for the selected patient.</p>
                        </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Patient</span>
                        <span className="text-sm font-bold text-blue-900">{patient.full_name}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Clinical Context */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <Calendar size={12} /> Appointment
                            </label>
                            <select
                                value={builderData.appointmentId}
                                onChange={e => setBuilderData(prev => ({ ...prev, appointmentId: e.target.value }))}
                                className="w-full text-sm p-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            >
                                <option value="">-- Choose session --</option>
                                {validAppointments.map(a => (
                                    <option key={a.id} value={a.id}>{new Date(a.date).toLocaleDateString()} - {a.time}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 relative" ref={searchRef}>
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <Search size={12} /> Diagnosis
                            </label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text" value={diagSearchText}
                                    onChange={e => setDiagSearchText(e.target.value)}
                                    placeholder="Search diagnoses..."
                                    className="w-full text-sm pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl"
                                />
                                {isSearchingDiag && <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                            </div>
                            {showDiagDropdown && (
                                <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-2xl mt-2 max-h-64 overflow-auto">
                                    {diagSearchResults.map(result => (
                                        <li key={result.id} onClick={() => selectDiagnosis(result)} className="px-5 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                            <div className="flex items-center justify-between"><span className="font-bold text-blue-600">{result.code}</span><span className="text-xs text-slate-400">ICD-10</span></div>
                                            <p className="text-sm text-slate-700 mt-0.5">{result.name}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {builderData.diagnosis && (
                                <div className="mt-2 flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{builderData.diagnosis_code}</div>
                                        <span className="text-sm font-medium text-blue-900 truncate max-w-[200px]">{builderData.diagnosis}</span>
                                    </div>
                                    <button onClick={() => setBuilderData(prev => ({ ...prev, diagnosis: "", diagnosis_code: "" }))} className="text-blue-400 hover:text-blue-600"><ArrowLeft size={16} className="rotate-180" /></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Medications */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Pill size={18} className="text-blue-500" /> Medications</h4>
                                <p className="text-xs text-slate-500">Add medicines, dosage, and intake route.</p>
                            </div>
                            <button onClick={addMedicine} className="group px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all">
                                <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Add Medicine
                            </button>
                        </div>

                        <div className="space-y-4">
                            {builderData.items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                                    <Pill size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm font-semibold text-slate-400">No medicines added.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {builderData.items.map((item, idx) => (
                                        <div key={idx} className="group p-6 bg-white border border-slate-200 rounded-3xl relative hover:border-blue-300 hover:shadow-xl transition-all">
                                            <button onClick={() => removeMedicine(idx)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                                <div className="lg:col-span-5"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Medicine Name</label><input type="text" value={item.medicine_name} onChange={e => updateMedicine(idx, 'medicine_name', e.target.value)} className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl" placeholder="e.g. Paracetamol" /></div>
                                                <div className="lg:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Strength</label><input type="text" value={item.strength} onChange={e => updateMedicine(idx, 'strength', e.target.value)} className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl" placeholder="e.g. 500mg" /></div>
                                                <div className="lg:col-span-3"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Route</label><select value={item.route} onChange={e => updateMedicine(idx, 'route', e.target.value)} className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none"><option value="Oral">Oral</option><option value="IV">IV</option><option value="Local">Local</option><option value="IM">IM</option><option value="Other">Other</option></select></div>
                                                <div className="lg:col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Duration</label><input type="text" value={item.duration} onChange={e => updateMedicine(idx, 'duration', e.target.value)} className="w-full text-sm p-3 bg-slate-50 border border-slate-100 rounded-xl" placeholder="e.g. 5 days" /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1"><FileText size={16} className="text-slate-400" /> Instructions</label>
                        <textarea rows={3} value={builderData.notes} onChange={e => setBuilderData(prev => ({ ...prev, notes: e.target.value }))} className="w-full text-sm p-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all" placeholder="Take after food..."></textarea>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-8 mt-4">
                        <button onClick={() => handleIssue(false)} disabled={saving} className="px-6 py-3 border border-slate-200 bg-white text-slate-600 rounded-2xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Draft</button>
                        <button onClick={() => handleIssue(true)} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-sm font-bold active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0">{saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Issue Prescription</button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. HISTORY MODE
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Prescription History</h3>
                <button onClick={() => setShowBuilder(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-95 transition-all">+ New Prescription</button>
            </div>

            {loading ? <div className="py-12 flex flex-col items-center gap-3 text-slate-400"><Loader2 className="animate-spin" /><p className="text-xs uppercase font-bold tracking-widest">Loading Records</p></div> : prescriptions.length === 0 ? <div className="p-12 bg-slate-50 border-2 border-dashed rounded-3xl text-center text-slate-400 font-medium italic">No past prescriptions found.</div> : prescriptions.map(px => (
                <div key={px.id} className="p-6 bg-white border border-slate-200 rounded-3xl hover:border-blue-300 hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{px.appointment_date}</div>
                            <div className="text-sm font-bold text-slate-800">Dr. {px.practitioner_name}</div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border ${px.status === "issued" ? "bg-green-50 text-green-600 border-green-100" : "bg-amber-100 text-amber-600 border-amber-100"}`}>{px.status}</span>
                    </div>
                    <div className="mb-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diagnosis</div>
                        <div className="text-sm font-medium text-slate-700">{px.diagnosis}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {px.items.map((m, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 whitespace-nowrap">{m.medicine_name} ({m.strength})</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
