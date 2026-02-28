"use client";

import { authFetch } from "@/lib/authFetch";
import { useEffect, useState } from "react";
import {
    User, MapPin, Phone, Mail, ShieldCheck,
    CheckCircle, Stethoscope, Camera, Save,
    X, Globe, Landmark, AlertCircle, Fingerprint,
    Briefcase, Award, Activity, HeartPulse, Lock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

/* -----------------------------
   S3 Upload Helper
----------------------------- */
async function uploadAvatarToS3(file: File) {
    console.log("STEP 1: requesting presigned url");

    const presignRes = await authFetch("/api/uploads/avatar-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
    });

    console.log("presign status", presignRes.status);

    if (!presignRes.ok) {
        const t = await presignRes.text();
        console.log("presign error", t);
        throw new Error("Failed to get upload URL");
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    console.log("STEP 2: uploading to S3");

    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": file.type,
        },
        body: file,
    });

    console.log("upload status", uploadRes.status);

    if (!uploadRes.ok) {
        const t = await uploadRes.text();
        console.log("upload error", t);
        throw new Error("Image upload failed");
    }

    console.log("STEP 3: success");

    return publicUrl;
}
export default function UnifiedProfileUI() {
    const { user } = useAuth();

    const [userData, setUserData] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setUserData(user);
        console.log(user)
        setEditForm({
            first_name: user.profile?.first_name || "",
            last_name: user.profile?.last_name || "",
            city: user.profile?.city || "",
            state: user.profile?.state || "",
            country: user.profile?.country || "",
            phone: user.phone || user.patient?.contact_number || "",
            address: user.patient?.address || "",
            allergies: user.patient?.allergies?.join(", ") || "",
            specialty: user.practitioner?.specialty || "",
            license: user.practitioner?.license_number || "",
            // Mapping the Govt ID field
            govtId: user.goveId?.id_number_encrypted || "",
        });
        setLoading(false);
    }, [user]);

    const handleSave = async () => {
        try {
            setUploadingAvatar(true);
            let avatarUrl = userData.profile.avatar_url;
            if (avatarFile) avatarUrl = await uploadAvatarToS3(avatarFile);

            const isPatient = userData.role === "patient";

            const payload = {
                phone: editForm.phone,
                profile: {
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    city: editForm.city,
                    state: editForm.state,
                    country: editForm.country,
                    avatar_url: avatarUrl,
                },
                ...(isPatient ? {
                    patient: {
                        contact_number: editForm.phone,
                        address: editForm.address,
                        allergies: editForm.allergies ? editForm.allergies.split(",").map((a: string) => a.trim()) : [],
                    },
                    // Update Gov ID logic
                    goveId: {
                        id_number_encrypted: editForm.govtId
                    }
                } : {
                    practitioner: {
                        contact_number: editForm.phone,
                    }
                })
            };

            const res = await authFetch("/api/auth/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Sync failed");

            toast.success("Identity & Profile synchronized");
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    if (loading || !userData) return <LoadingSpinner />;

    const isPractitioner = userData.role === "practitioner";
    const theme = isPractitioner
        ? { primary: "bg-indigo-600", light: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100", gradient: "from-indigo-600 to-indigo-900", icon: <Stethoscope size={48} /> }
        : { primary: "bg-blue-600", light: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100", gradient: "from-blue-600 to-blue-800", icon: <User size={48} /> };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
            <div className={`h-2 w-full ${theme.primary} sticky top-0 z-50`} />

            <div className="max-w-6xl mx-auto px-4 mt-8">

                {/* --- HEADER --- */}
                <header className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 p-8 md:p-10 mb-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="relative group">
                                <div className={`w-36 h-36 rounded-[2.5rem] overflow-hidden ring-8 ${theme.ring} flex items-center justify-center bg-slate-50 transition-all`}>
                                    {avatarPreview || userData.profile.avatar_url ? (
                                        <img src={avatarPreview || userData.profile.avatar_url} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <div className={`${theme.text}`}>{theme.icon}</div>
                                    )}
                                    {isEditing && (
                                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                            <Camera className="text-white" size={32} />
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                                            }} />
                                        </label>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 border-4 border-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                                    <CheckCircle size={20} className="text-white" />
                                </div>
                            </div>

                            <div className="text-center md:text-left">
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
                                    {userData.profile.first_name} {userData.profile.last_name}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                                    <p className="text-slate-500 flex items-center gap-1.5 text-sm font-semibold">
                                        <MapPin size={16} className="text-slate-400" /> {userData.profile.city || "Pending"}, {userData.profile.country}
                                    </p>
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${theme.light} ${theme.text}`}>
                                        {userData.role} ACCOUNT
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2"><X size={18} /> Cancel</button>
                                    <button onClick={handleSave} className="px-8 py-3 rounded-2xl font-bold bg-emerald-600 text-white flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"><Save size={18} /> {uploadingAvatar ? "Saving..." : "Save Changes"}</button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="px-8 py-3 rounded-2xl font-bold border-2 border-slate-200 text-slate-700 hover:border-slate-900 hover:bg-slate-50 transition-all">Edit Profile</button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* --- SIDEBAR --- */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className={`bg-gradient-to-br ${theme.gradient} p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group`}>
                            <Fingerprint size={120} className="absolute -right-4 -bottom-4 opacity-10" />
                            <h4 className="font-bold text-xs uppercase tracking-widest opacity-70 mb-6">Internal Audit ID</h4>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl font-mono text-[10px] border border-white/20 break-all select-all">
                                {userData.practitioner_id || userData.patient_id || "UNASSIGNED"}
                            </div>
                        </div>

                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-2 tracking-tighter">
                                <ShieldCheck size={18} className={theme.text} /> SECURITY & IDENTITY
                            </h3>
                            <div className="space-y-8">
                                <SidebarItem label="Network Email" value={userData.user.email} icon={<Mail size={16} />} />

                                {/* GOVT ID DISPLAY (Patient Context) */}
                                {!isPractitioner && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Lock size={14} className="text-emerald-500" /> Government ID
                                        </p>
                                        {isEditing ? (
                                            <input
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-semibold focus:border-blue-500 outline-none transition-all"
                                                value={editForm.govtId}
                                                placeholder="National ID / Passport #"
                                                onChange={(e) => setEditForm({ ...editForm, govtId: e.target.value })}
                                            />
                                        ) : (
                                            <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-3">
                                                <p className="text-slate-900 font-mono text-xs font-bold tracking-widest">
                                                    {editForm.govtId ? `•••• •••• ${editForm.govtId.slice(-4)}` : "NOT VERIFIED"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={14} /> Recovery Phone</p>
                                    {isEditing ? (
                                        <input type="tel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-semibold focus:border-blue-500 outline-none" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                                    ) : (
                                        <p className="text-slate-900 font-bold">{editForm.phone || "No phone linked"}</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* --- MAIN CONTENT --- */}
                    <div className="lg:col-span-8">
                        <section className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-2xl font-black text-slate-900">{isPractitioner ? "Medical Credentials" : "Health Profile"}</h3>
                                {!isPractitioner && userData.patient?.blood_type && (
                                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black border border-red-100 flex items-center gap-2">
                                        <HeartPulse size={14} /> TYPE {userData.patient.blood_type}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                                <FormInput label="First Name" value={editForm.first_name} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, first_name: v })} icon={<User size={16} />} />
                                <FormInput label="Last Name" value={editForm.last_name} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, last_name: v })} icon={<User size={16} />} />
                                <FormInput label="City" value={editForm.city} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, city: v })} icon={<MapPin size={16} />} />
                                <FormInput label="Country" value={editForm.country} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, country: v })} icon={<Globe size={16} />} />

                                {isPractitioner ? (
                                    <>
                                        <FormInput label="Specialty" value={user.practitioner.specialization.join(", ")} isEditing={false} onChange={(v: string) => setEditForm({ ...editForm, specialty: v })} icon={<Activity size={16} />} />
                                    </>
                                ) : (
                                    <>
                                        <div className="md:col-span-2">
                                            <FormInput label="Residential Address" value={editForm.address} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, address: v })} icon={<Landmark size={16} />} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <AllergyTagInput label="Known Allergies" value={editForm.allergies} isEditing={isEditing} onChange={(v: string) => setEditForm({ ...editForm, allergies: v })} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* --- ATOMIC UI COMPONENTS --- */

function LoadingSpinner() {
    return <div className="flex flex-col justify-center items-center h-screen bg-slate-50"><div className="w-14 h-14 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" /><p className="text-slate-400 font-black tracking-[0.2em] text-[10px] uppercase">Securing Connection</p></div>;
}

function SidebarItem({ label, value, icon }: any) {
    return (<div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1.5">{icon} {label}</p><p className="text-sm font-bold text-slate-900 break-all">{value || "—"}</p></div>);
}

function FormInput({ label, value, isEditing, onChange, icon }: any) {
    return (
        <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-blue-600 transition-colors">{icon} {label}</label>
            {isEditing ? (
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-800" value={value} onChange={(e) => onChange(e.target.value)} />
            ) : (
                <p className="text-lg font-black text-slate-800 px-1 truncate">{value || "—"}</p>
            )}
        </div>
    );
}

function AllergyTagInput({ label, value, isEditing, onChange }: any) {
    const list = value ? value.split(",").filter((i: string) => i.trim() !== "") : [];
    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            {isEditing ? (
                <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-800 min-h-[100px]" value={value} placeholder="Peanuts, Aspirin..." onChange={(e) => onChange(e.target.value)} />
            ) : (
                <div className="flex flex-wrap gap-2">
                    {list.length > 0 ? list.map((a: string, i: number) => (
                        <span key={i} className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-[10px] font-black border border-red-100 uppercase tracking-tight">{a.trim()}</span>
                    )) : <p className="text-slate-400 italic text-sm">None reported</p>}
                </div>
            )}
        </div>
    );
}