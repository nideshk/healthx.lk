"use client";

import React, { useEffect, useMemo, useState } from "react";
import Input from "@/components/atom/Input/Input";
import Textarea from "@/components/atom/Textarea/Textarea";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";
import { Clock, User, UserCheck } from "lucide-react";

/* ---------------- TYPES ---------------- */

type Practitioner = {
    id: string;
    full_name: string;
    email?: string;
};

type Patient = {
    id: string;
    full_name: string;
    email?: string;
    contact_number?: string;
};

type AppointmentType = {
    id: string;
    name: string;
    duration_mins: number;
};

type AvailabilityResponse = {
    practitioner_id: string;
    date: string;
    timezone: string;
    start_time: string;
    end_time: string;
    offered_types: AppointmentType[];
    booked_intervals: any[];
    slots_by_type: Record<string, string[]>;
    fees: number;
};

/* ---------------- COMPONENT ---------------- */

export default function CreateAppointmentTab() {
    const [loading, setLoading] = useState(false);

    /* ---------------- PRACTITIONERS ---------------- */

    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [practitionerSearch, setPractitionerSearch] = useState("");
    const [loadingPractitioners, setLoadingPractitioners] = useState(false);

    /* ---------------- PATIENTS ---------------- */

    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientSearch, setPatientSearch] = useState("");
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [patientPage, setPatientPage] = useState(1);
    const [patientTotalPages, setPatientTotalPages] = useState(1);
    const [fees, setFees] = useState(0);
    const patientLimit = 10;

    /* ---------------- APPOINTMENT DATA ---------------- */

    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    /* ---------------- FORM STATE ---------------- */

    const [form, setForm] = useState({
        practitioner_id: "",
        appointment_type_id: "",
        patient_id: "",
        date: "",
        start_time: "",
        notes: "",
    });

    /* ---------------- FETCH PRACTITIONERS ---------------- */

    useEffect(() => {
        let active = true;
        setLoadingPractitioners(true);

        const fetchPractitioners = async () => {
            try {
                const res = await fetch(
                    `/api/practitioners?q=${encodeURIComponent(practitionerSearch)}`
                );
                const json = await res.json();
                console.log(json)
                if (!res.ok) throw new Error(json.error);
                if (active) setPractitioners(json.data || []);
            } catch {
                if (active) setPractitioners([]);
            } finally {
                if (active) setLoadingPractitioners(false);
            }
        };

        fetchPractitioners();
        return () => {
            active = false;
        };
    }, [practitionerSearch]);

    /* ---------------- FETCH PRACTITIONER DETAILS ---------------- */

    useEffect(() => {
        if (!form.practitioner_id) {
            setAppointmentTypes([]);
            setAvailability(null);
            return;
        }

        let active = true;

        const loadPractitioner = async () => {
            try {
                const res = await authFetch(`/api/practitioners/${form.practitioner_id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                console.log("data", data)
                if (active) {
                    setAppointmentTypes(data.practitioner.appointment_types || []);
                }
            } catch {
                toast.error("Failed to load practitioner");
            }
        };

        loadPractitioner();
        return () => {
            active = false;
        };
    }, [form.practitioner_id]);

    /* ---------------- FETCH PATIENTS (REAL API) ---------------- */

    useEffect(() => {
        let active = true;

        const fetchPatients = async () => {
            setLoadingPatients(true);
            try {
                const params = new URLSearchParams();
                if (patientSearch.trim().length >= 4) {
                    params.append("q", patientSearch.trim());
                }
                params.append("page", patientPage.toString());
                params.append("limit", patientLimit.toString());

                const res = await authFetch(`/api/patient?${params.toString()}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (active) {
                    setPatients(data.data || []);
                    setPatientTotalPages(data.meta?.totalPages || 1);
                }
            } catch {
                if (active) setPatients([]);
            } finally {
                if (active) setLoadingPatients(false);
            }
        };

        fetchPatients();
        return () => {
            active = false;
        };
    }, [patientSearch, patientPage]);

    /* ---------------- FETCH AVAILABILITY ---------------- */

    useEffect(() => {
        if (!form.practitioner_id || !form.date) {
            setAvailability(null);
            return;
        }

        let active = true;
        setLoadingSlots(true);

        const fetchAvailability = async () => {
            try {
                const res = await authFetch(
                    `/api/booking/${form.practitioner_id}/availability?date=${form.date}`
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                if (active) setAvailability(data);
            } catch {
                if (active) setAvailability(null);
            } finally {
                if (active) setLoadingSlots(false);
            }
        };

        fetchAvailability();
        return () => {
            active = false;
        };
    }, [form.practitioner_id, form.date]);

    /* ---------------- DERIVED SLOTS ---------------- */

    const slotsForSelectedType = useMemo(() => {
        if (!availability || !form.appointment_type_id) return [];
        const selectedType = appointmentTypes.find(
            t => t.id === form.appointment_type_id
        );
        if (!selectedType) return [];
        return availability.slots_by_type?.[selectedType.name] || [];
    }, [availability, form.appointment_type_id, appointmentTypes]);

    /* ---------------- HANDLERS ---------------- */

    const handleChange = (key: string, value: string) => {
        setForm(prev => ({
            ...prev,
            [key]: value,
            ...(key === "practitioner_id"
                ? { appointment_type_id: "", date: "", start_time: "" }
                : {}),
            ...(key === "appointment_type_id" ? { start_time: "" } : {}),
            ...(key === "date" ? { start_time: "" } : {}),
        }));
    };

    const handleSubmit = async () => {
        if (loading) return; // ⛔ prevent double submit

        if (!form.patient_id) {
            toast.error("Please select a patient");
            return;
        }

        if (!form.start_time) {
            toast.error("Please select a time slot");
            return;
        }

        setLoading(true);

        try {
            const res = await authFetch("/api/create-appointment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            let data: any = null;
            try {
                data = await res.json();
            } catch {
                // non-JSON error (rare but possible)
            }

            if (!res.ok) {
                throw new Error(data?.error || "Failed to create appointment");
            }

            toast.success("Appointment created successfully");

            // 🔄 Reset only appointment-specific fields
            setForm(prev => ({
                ...prev,
                appointment_type_id: "",
                date: "",
                start_time: "",
                notes: "",
            }));

            setAvailability(null);
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };


    /* ---------------- UI ---------------- */
    return (
        <div className="flex flex-col lg:flex-row gap-8 bg-gray-50 p-4 min-h-screen">
            {/* MAIN FORM */}
            <div className="flex-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">New Appointment</h2>
                    <p className="text-slate-500">Schedule a session for a patient and practitioner.</p>
                </header>

                <div className="space-y-6">
                    {/* SECTION: Participants */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                <UserCheck size={16} className="text-teal-600" /> Practitioner
                            </label>
                            <select
                                className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 transition-all"
                                value={form.practitioner_id}
                                onChange={e => handleChange("practitioner_id", e.target.value)}
                            >
                                <option value="">Select practitioner</option>
                                {practitioners.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                <User size={16} className="text-teal-600" /> Patient
                            </label>
                            <div className="relative">
                                <input
                                    placeholder="Search name..."
                                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5 mb-2"
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                />
                                <select
                                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-2.5"
                                    value={form.patient_id}
                                    onChange={e => handleChange("patient_id", e.target.value)}
                                >
                                    <option value="">{loadingPatients ? "Searching..." : "Select result"}</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* SECTION: Appointment Details */}
                    <section className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-sm font-semibold text-slate-700 block mb-2">Service Type</label>
                                <select
                                    className="w-full border-slate-200 rounded-lg"
                                    value={form.appointment_type_id}
                                    onChange={e => handleChange("appointment_type_id", e.target.value)}
                                    disabled={!form.practitioner_id}
                                >
                                    <option value="">Select type</option>
                                    {appointmentTypes.map(type => (
                                        <option key={type.id} value={type.id}>{type.name} ({type.duration_mins}m)</option>
                                    ))}
                                </select>
                            </div>
                            <Input
                                type="date"
                                label="Date"
                                value={form.date}
                                onChange={e => handleChange("date", e.target.value)}
                                disabled={!form.appointment_type_id}
                            />
                        </div>

                        {/* SLOT GRID */}
                        <div className="mt-6">
                            <label className="text-sm font-semibold text-slate-700 block mb-3">Available Slots</label>
                            {loadingSlots ? (
                                <div className="flex gap-2 animate-pulse">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-20 bg-slate-200 rounded-lg" />)}
                                </div>
                            ) : slotsForSelectedType.length > 0 ? (
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {slotsForSelectedType.map(time => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => handleChange("start_time", time)}
                                            className={`py-2 text-sm font-medium rounded-lg border transition-all ${form.start_time === time
                                                ? "bg-teal-600 border-teal-600 text-white shadow-md"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-teal-500"
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No slots available for this selection.</p>
                            )}
                        </div>
                    </section>

                    <Textarea
                        label="Internal Notes"
                        placeholder="Add details about the visit..."
                        value={form.notes}
                        onChange={e => handleChange("notes", e.target.value)}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !form.start_time}
                        className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg shadow-teal-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? "Processing..." : "Confirm Appointment"}
                    </button>
                </div>
            </div>

            {/* SIDEBAR SUMMARY */}
            <div className="w-full lg:w-80 space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-4">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-teal-600" /> Appointment Summary
                    </h3>
                    <div className="space-y-4 text-sm">
                        <SummaryItem label="Practitioner" value={practitioners.find(p => p.id === form.practitioner_id)?.full_name} />
                        <SummaryItem label="Patient" value={patients.find(p => p.id === form.patient_id)?.full_name} />
                        <SummaryItem label="Date" value={form.date} />
                        <SummaryItem label="Time" value={form.start_time} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryItem({ label, value }: { label: string, value?: string }) {
    return (
        <div className="border-b border-slate-50 pb-2">
            <span className="text-slate-400 block text-xs uppercase tracking-wider font-semibold">{label}</span>
            <span className="text-slate-700 font-medium">{value || "—"}</span>
        </div>
    );
}