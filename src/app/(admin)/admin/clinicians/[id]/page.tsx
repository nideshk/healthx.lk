"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";

export default function ClinicianProfile() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, watch, formState } = useForm({
        defaultValues: {
            profile_bio: "",
            cliniko_practitioner_id: "",
            solo_consultation_fee: 0,
            family_consultation_fee: 0,
            available_services: [] as string[],
        },
    });

    const { isDirty } = formState;
    const [clinician, setClinician] = useState<any>(null);

    // ✅ Fetch clinician data
    useEffect(() => {
        if (!id) return;
        const fetchClinician = async () => {
            try {
                const res = await fetch(`/api/clinician/${id}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load clinician");
                setClinician(data.data);
                reset({
                    profile_bio: data.data.profile_bio || "",
                    solo_consultation_fee: data.data.solo_consultation_fee || 0,
                    family_consultation_fee: data.data.family_consultation_fee || 0,
                    available_services: data.data.available_services || [],
                    cliniko_practitioner_id: data.data.cliniko_practitioner_id
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchClinician();
    }, [id, reset]);

    const onSubmit = async (formData: any) => {
        setSaving(true);
        try {
            const res = await fetch(`/api/clinician/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");
            alert("Clinician updated successfully!");
            reset(formData); // ✅ reset dirty state
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="text-center py-10">Loading clinician...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;
    if (!clinician) return <p className="text-center text-gray-500">No data found.</p>;

    const servicesList = [
        "General consultation",
        "Preventive care",
        "Chronic care",
        "Mental health",
        "Dermatology",
        "Family planning",
    ];

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-6"
        >
            <h1 className="text-2xl font-bold mb-6 text-gray-900">
                Clinician Profile
            </h1>

            {/* Profile Picture */}
            <section className="mb-6 ">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Profile Picture
                </h2>
                <div className="flex justify-between items-center">

                    {clinician.profile_picture_url ? (
                        <img
                            src={clinician.profile_picture_url}
                            alt={clinician.full_name}
                            className="w-24 h-24 rounded-full object-cover border"
                        />
                    ) : (
                        <p className="text-sm text-gray-500">No profile picture uploaded</p>
                    )}
                    <input
                        placeholder="Cliniko ID"
                        type="number"
                        className="w-96 h-10  mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
                        {...register("cliniko_practitioner_id")}
                    />
                </div>
            </section>

            {/* Basic Info */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Basic Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Full Name" value={clinician.full_name} />
                    <ReadOnlyField label="Specialization" value={clinician.specialization} />
                    <ReadOnlyField label="Qualification" value={clinician.qualification} />
                    <ReadOnlyField label="License Number" value={clinician.license_number} />
                    <ReadOnlyField label="Experience (Years)" value={clinician.experience_years} />
                </div>
            </section>

            {/* Contact Info */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Contact Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Email" value={clinician.contact_email} />
                    <ReadOnlyField label="Phone" value={clinician.contact_number} />
                </div>
            </section>

            {/* Editable Professional Summary */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Professional Summary
                </h2>
                <textarea
                    {...register("profile_bio")}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm min-h-[100px]"
                />
            </section>

            {/* Fees Section */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Consultation Fees
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <EditableField
                        label="Solo Consultation Fee (LKR)"
                        register={register("solo_consultation_fee")}
                    />
                    <EditableField
                        label="Family Consultation Fee (LKR)"
                        register={register("family_consultation_fee")}
                    />
                </div>
            </section>

            {/* Services */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Available Services
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {servicesList.map((service) => (
                        <label key={service} className="flex items-center space-x-2 text-sm">
                            <input
                                type="checkbox"
                                value={service}
                                {...register("available_services")}
                            />
                            <span>{service}</span>
                        </label>
                    ))}
                </div>
            </section>

            {/* Bank Details */}
            <section className="mb-6">
                <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Bank Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="Bank Name" value={clinician.bank_name} />
                    <ReadOnlyField label="Account Name" value={clinician.account_name} />
                    <ReadOnlyField label="Branch Location" value={clinician.branch_location} />
                    <ReadOnlyField label="Account Number" value={clinician.account_number} />
                </div>
            </section>

            {/* Submit */}
            <button
                type="submit"
                disabled={!isDirty || saving}
                className={`w-full mt-4 py-2 rounded-md text-white font-medium transition-all ${!isDirty || saving
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
            >
                {saving ? "Saving..." : isDirty ? "Save Changes" : "No Changes Detected"}
            </button>
        </form>
    );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | number }) {
    return (
        <div>
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <input
                disabled
                value={value || ""}
                className="w-full mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50"
            />
        </div>
    );
}

function EditableField({ label, register }: { label: string; register: any }) {
    return (
        <div>
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <input
                type="number"
                {...register}
                className="w-full mt-1 border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
        </div>
    );
}
