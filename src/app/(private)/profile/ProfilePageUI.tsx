"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";
import {
    User, MapPin, Phone, Mail, Calendar,
    ShieldCheck, Edit3, CheckCircle, Stethoscope,
    Fingerprint, Activity
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

/* -----------------------------
   S3 Upload Helper
----------------------------- */
async function uploadAvatarToS3(file: File) {
    const presignRes = await authFetch("/api/uploads/avatar-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
    });

    if (!presignRes.ok) {
        throw new Error("Failed to get upload URL");
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
    });

    if (!uploadRes.ok) {
        throw new Error("Image upload failed");
    }

    return publicUrl;
}

export default function AdaptiveProfileUI() {
    const router = useRouter();
    const { user } = useAuth();

    const [userData, setUserData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    /* -----------------------------
       Load Profile
    ----------------------------- */
    useEffect(() => {
        const load = async () => {
            try {
                const res = await authFetch("/api/auth/me");
                const json = await res.json();
                const userInfo = json.user;

                setUserData(userInfo);
                setEditForm({
                    first_name: userInfo.profile.first_name,
                    last_name: userInfo.profile.last_name,
                    city: userInfo.profile.city,
                    state: userInfo.profile.state?.trim() ?? "",
                    country: userInfo.profile.country,
                });
            } catch {
                toast.error("User not authenticated");
                router.replace("/");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [router]);

    /* -----------------------------
       Avatar Select
    ----------------------------- */
    const handleAvatarSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Only image files allowed");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be under 2MB");
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    /* -----------------------------
       Save Profile
    ----------------------------- */
    const handleSave = async () => {
        try {
            let avatarUrl = userData.profile.avatar_url;

            if (avatarFile) {
                setUploadingAvatar(true);
                avatarUrl = await uploadAvatarToS3(avatarFile);
            }

            const res = await authFetch("/api/auth/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profile: {
                        first_name: editForm.first_name,
                        last_name: editForm.last_name,
                        city: editForm.city,
                        state: editForm.state,
                        country: editForm.country,
                        avatar_url: avatarUrl,
                    },
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Update failed");
            }

            setUserData((prev: any) => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    ...editForm,
                    avatar_url: avatarUrl,
                },
            }));

            toast.success("Profile updated");
            setIsEditing(false);
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to update profile");
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen text-slate-500 animate-pulse">
                Initializing Secure Session...
            </div>
        );
    }

    if (!userData) {
        return <div className="text-center p-10">Profile not found.</div>;
    }

    const { profile, user: auth, phone, patient_id, practitioner_id } = userData;
    const isPractitioner = profile.role === "practitioner";
    const themeColor = isPractitioner ? "indigo" : "blue";
    const roleIcon = isPractitioner ? <Stethoscope size={48} /> : <User size={48} />;

    return (
        <div className="min-h-screen bg-[#FBFBFE] pb-12 font-sans">
            {/* Top Branding Strip */}
            <div className={`h-1.5 w-full bg-${themeColor}-600`} />

            <div className="max-w-5xl mx-auto px-4 mt-8">
                {/* Header Profile Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-8">
                            {/* Avatar */}
                            <div className="relative">
                                <label className="cursor-pointer group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={!isEditing}
                                        onChange={(e) => {
                                            if (!isEditing) return;
                                            if (e.target.files?.[0]) {
                                                handleAvatarSelect(e.target.files[0]);
                                            }
                                        }}
                                    />


                                    {(avatarPreview || profile.avatar_url) ? (
                                        <img
                                            src={avatarPreview || profile.avatar_url}
                                            className={`w-28 h-28 rounded-3xl object-cover ring-4 ring-${themeColor}-50 group-hover:opacity-80 transition`}
                                        />
                                    ) : (
                                        <div className={`w-28 h-28 bg-${themeColor}-50 rounded-3xl flex items-center justify-center text-${themeColor}-600`}>
                                            {roleIcon}
                                        </div>
                                    )}

                                    {isEditing && <div className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white transition">
                                        Change
                                    </div>}
                                </label>

                                {profile.is_active && (
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 border-4 border-white w-7 h-7 rounded-full flex items-center justify-center">
                                        <CheckCircle size={14} className="text-black" />
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-center sm:text-left">
                                <h1 className="text-3xl font-extrabold">
                                    {profile.first_name} {profile.last_name}
                                </h1>
                                <p className="text-slate-400 flex items-center gap-1 mt-2">
                                    <MapPin size={16} /> {profile.city}, {profile.country}
                                </p>
                            </div>
                        </div>

                        <button
                            disabled={uploadingAvatar}
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold ${isEditing
                                ? "bg-emerald-600 text-white"
                                : "bg-white border"
                                }`}
                        >
                            {uploadingAvatar
                                ? "Uploading..."
                                : isEditing
                                    ? "Save Changes"
                                    : "Edit Profile"}
                        </button>
                    </div>
                </div>

                {/* ===== REST OF YOUR UI (UNCHANGED) ===== */}
                {/* ID Card, Security Section, Personal Records, Role Insight */}
                {/* This part stays exactly as you already had it */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
                    {/* Left Column: Role-Specific ID and MFA */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* ID Card */}
                        <div className={`bg-gradient-to-br from-${themeColor}-600 to-${themeColor}-800 p-8 rounded-[2rem] text-black shadow-2xl shadow-${themeColor}-200 relative overflow-hidden`}>
                            <Fingerprint className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32" />
                            <h4 className="font-black text-sm uppercase tracking-widest opacity-80 mb-6">System Identity</h4>
                            <p className="text-xs mb-1 font-bold uppercase opacity-60">Registered {isPractitioner ? "Practitioner" : "Patient"} ID</p>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl font-mono text-xs break-all border border-white/20 mb-6">
                                {practitioner_id || patient_id}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                                <Activity size={14} /> Account Status: <span className="text-emerald-300">Active</span>
                            </div>
                        </div>

                        {/* Security Section */}
                        <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <ShieldCheck size={18} className={`text-${themeColor}-500`} /> Security Settings
                            </h3>
                            <div className="space-y-6">
                                <InfoBlock icon={<Mail size={18} />} label="Email Address" value={auth.email} />
                                <InfoBlock icon={<Phone size={18} />} label="Phone Contact" value={phone || "None Listed"} />
                                <div className="pt-2">
                                    <div className={`flex items-center justify-between p-3 rounded-xl ${profile.multi_factor ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        <span className="text-xs font-bold">2FA Status</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white font-bold uppercase">
                                            {profile.multi_factor ? "Enabled" : "Disabled"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Personal Data */}
                    <div className="lg:col-span-8">
                        <section className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-black text-slate-800 mb-8 border-b border-slate-50 pb-4">
                                Personal Records
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <EditInput label="First Name" name="first_name" value={editForm.first_name} isEditing={isEditing} onChange={setEditForm} theme={themeColor} />
                                <EditInput label="Last Name" name="last_name" value={editForm.last_name} isEditing={isEditing} onChange={setEditForm} theme={themeColor} />
                                <EditInput label="City" name="city" value={editForm.city} isEditing={isEditing} onChange={setEditForm} theme={themeColor} />
                                <EditInput label="State / Province" name="state" value={editForm.state} isEditing={isEditing} onChange={setEditForm} theme={themeColor} />
                                <EditInput label="Country" name="country" value={editForm.country} isEditing={isEditing} onChange={setEditForm} theme={themeColor} />
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Registration Date</label>
                                    <div className="text-sm font-bold text-slate-700 py-2 flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-300" />
                                        {new Date(profile.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Helper Components */
function InfoBlock({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-4">
            <div className="text-slate-300">{icon}</div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-700">{value}</p>
            </div>
        </div>
    );
}

function EditInput({ label, name, value, isEditing, onChange, theme }: any) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
            {isEditing ? (
                <input
                    type="text"
                    className={`bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-${theme}-100 focus:border-${theme}-400 outline-none transition-all font-bold text-slate-800`}
                    value={value}
                    onChange={(e) => onChange((prev: any) => ({ ...prev, [name]: e.target.value }))}
                />
            ) : (
                <div className="text-sm font-bold text-slate-700 py-1">
                    {value || "Not Provided"}
                </div>
            )}
        </div>
    );
}