"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Appointment, Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import { Card, CardBody } from "@/components/atom/Card/Card";
import { FileText, ExternalLink, Pill, Calendar, User, Plus, ArrowLeft, Trash2, Save, Send, Loader2, Search } from "lucide-react";
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

    if (showBuilder) {
        return (
            <div className="space-y-6 bg-white p-6 border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 border-b pb-4">
                    <button onClick={() => setShowBuilder(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                    <h3 className="text-sm font-semibold">New Prescription</h3>
                </div>

                <div className="space-y-4">
                    {/* Appointment Selector */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Select Appointment</label>
                        <select
                            value={builderData.appointmentId}
                            onChange={e => setBuilderData(prev => ({ ...prev, appointmentId: e.target.value }))}
                            className="w-full text-sm p-2 border rounded-md"
                        >
                            <option value="">-- Select --</option>
                            {validAppointments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {new Date(a.date).toLocaleDateString()} - {a.time} | {a.doctorName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Diagnosis */}
                    <div className="relative" ref={searchRef}>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Search Diagnosis</label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={diagSearchText}
                                onChange={e => setDiagSearchText(e.target.value)}
                                onFocus={() => { if (diagSearchResults.length > 0) setShowDiagDropdown(true); }}
                                placeholder="Search by name or code..."
                                className="w-full text-sm pl-9 pr-3 py-2 border rounded-md"
                            />
                            {isSearchingDiag && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                        </div>
                        {showDiagDropdown && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                                {diagSearchResults.length === 0 && !isSearchingDiag ? (
                                    <li className="px-4 py-3 text-sm text-gray-500">No results found</li>
                                ) : (
                                    diagSearchResults.map((result) => (
                                        <li
                                            key={result.id}
                                            onClick={() => selectDiagnosis(result)}
                                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 text-sm"
                                        >
                                            <span className="font-medium text-slate-900">{result.code}</span> - {result.name}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Selected Diagnosis readonly */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
                            <input type="text" disabled value={builderData.diagnosis_code} className="w-full text-sm p-2 border rounded-md bg-slate-50" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Diagnosis</label>
                            <input type="text" disabled value={builderData.diagnosis} className="w-full text-sm p-2 border rounded-md bg-slate-50" />
                        </div>
                    </div>

                    {/* Medicines */}
                    <div className="pt-4 border-t">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold">Medicines</h4>
                            <button onClick={addMedicine} className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1">
                                <Plus size={14} /> Add Medicine
                            </button>
                        </div>

                        {builderData.items.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No medicines added.</p>
                        ) : (
                            builderData.items.map((item, idx) => (
                                <div key={idx} className="p-3 border rounded-lg bg-slate-50 relative mb-3">
                                    <button onClick={() => removeMedicine(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">Name</label>
                                            <input type="text" value={item.medicine_name} onChange={e => updateMedicine(idx, 'medicine_name', e.target.value)} className="w-full text-sm p-1.5 border rounded" placeholder="Amoxicillin" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">Strength</label>
                                            <input type="text" value={item.strength} onChange={e => updateMedicine(idx, 'strength', e.target.value)} className="w-full text-sm p-1.5 border rounded" placeholder="500mg" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">Route</label>
                                            <select value={item.route} onChange={e => updateMedicine(idx, 'route', e.target.value)} className="w-full text-sm p-1.5 border rounded bg-white">
                                                <option value="Oral">Oral</option>
                                                <option value="IV">IV</option>
                                                <option value="Local">Local</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">Duration</label>
                                            <input type="text" value={item.duration} onChange={e => updateMedicine(idx, 'duration', e.target.value)} className="w-full text-sm p-1.5 border rounded" placeholder="5 days" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Notes */}
                    <div className="pt-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Special Notes</label>
                        <textarea rows={3} value={builderData.notes} onChange={e => setBuilderData(prev => ({ ...prev, notes: e.target.value }))} className="w-full text-sm p-2 border rounded-md" placeholder="Take after food..."></textarea>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button onClick={() => handleIssue(false)} disabled={saving} className="px-4 py-2 border rounded-md flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-50">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft
                        </button>
                        <button onClick={() => handleIssue(true)} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 text-sm hover:bg-green-700">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Issue Prescription
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-900">Prescription History</h3>
                <button
                    onClick={() => setShowBuilder(true)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                    Create New
                </button>
            </div>

            {/* List */}
            {prescriptions.length === 0 ? (
                <div className="text-center text-xs text-gray-500">No prescriptions</div>
            ) : (
                prescriptions.map(px => (
                    <Card key={px.id}>
                        <CardBody>
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">{px.appointment_date}</p>
                                    <p className="text-sm font-semibold">Dr. {px.practitioner_name}</p>
                                </div>
                                <span className="text-xs">{px.status}</span>
                            </div>

                            <div className="mt-3">
                                <p className="text-xs text-gray-500">Diagnosis</p>
                                <p className="text-sm italic">{px.diagnosis || "—"}</p>
                            </div>
                        </CardBody>
                    </Card>
                ))
            )}
        </div>
    );
}
