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

    const handleIssue = async (shouldIssue: boolean) => {
        if (!builderData.appointmentId) {
            toast.error("Please select an appointment.");
            return;
        }
        if (builderData.items.length === 0) {
            toast.error("Add at least one medicine.");
            return;
        }

        setSaving(true);
        try {
            const metaRes = await authFetch("/api/prescriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointment_id: builderData.appointmentId,
                    diagnosis: builderData.diagnosis,
                    diagnosis_code: builderData.diagnosis_code || null,
                    notes: builderData.notes
                })
            });

            if (!metaRes.ok) throw new Error("Failed to create prescription");
            const meta = await metaRes.json();
            const pxId = meta.id;

            await authFetch(`/api/prescriptions/${pxId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: builderData.items })
            });

            if (shouldIssue) {
                await authFetch(`/api/prescriptions/${pxId}/issue`, { method: "POST" });
                toast.success("Prescription issued");
            } else {
                toast.success("Draft saved");
            }

            setShowBuilder(false);
            setBuilderData({ appointmentId: "", diagnosis: "", diagnosis_code: "", notes: "", items: [] });
            fetchHistory();

        } catch (err: any) {
            toast.error(err.message);
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
