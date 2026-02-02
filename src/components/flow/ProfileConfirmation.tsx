import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { User, Calendar, Droplets, MapPin, Phone, FileText, AlertCircle, ChevronLeft, ChevronRight, Save, Loader2, Transgender } from 'lucide-react'
import { authFetch } from '@/lib/authFetch'
import { toast } from 'react-toastify'

// Constants for Dropdowns
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];

export default function PatientDetailsPage({ prevStep, nextStep }: { prevStep: () => void, nextStep: () => void }) {
    const { user, refreshUser } = useAuth()
    const [isSaving, setIsSaving] = useState(false)
    const [editing, setEditing] = useState(false)

    if (!user?.patient) return null
    const patient = user.patient

    const [form, setForm] = useState({
        dob: patient.dob ?? '',
        gender: patient.gender ?? '',
        blood_type: patient.blood_type ?? '',
        allergies: patient.allergies?.join(', ') ?? '',
        address: patient.address ?? '',
        emergency_contact: patient.emergency_contact ?? '',
        notes: patient.notes ?? '',
    })

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const onSave = async () => {
        setIsSaving(true)
        const payload = {
            patient: {
                ...form,
                allergies: form.allergies.split(',').map((a: any) => a.trim()).filter(Boolean),
            },
        }

        try {
            const res = await authFetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) throw new Error()
            toast.success('Medical record updated')
            setEditing(false)
        } catch (err) {
            console.log(err)
            toast.error('Update failed')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        // Full Page Wrapper
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
            <div className="max-w-3xl w-full bg-white shadow-2xl shadow-slate-200 border border-slate-200 rounded-3xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Patient Details</h1>
                            <p className="text-sm text-slate-500 font-medium">Step 2 of 4: Medical Information</p>
                        </div>
                    </div>

                    {!editing ? (
                        <button onClick={() => setEditing(true)} className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-all text-slate-700">
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-600">
                                Cancel
                            </button>
                            <button
                                onClick={onSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all font-bold disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Form Content */}
                <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                    {/* Column 1 */}
                    <div className="space-y-8">
                        <Field label="Full Name" value={patient.full_name} icon={<User className="w-5 h-5" />} />

                        <EditableField label="Date of Birth" name="dob" type="date" value={form.dob} editing={editing} onChange={onChange} icon={<Calendar className="w-5 h-5" />} />

                        <div className="flex gap-5">
                            <div className="mt-1 text-slate-300"><User className="w-5 h-5" /></div>
                            <div className="w-full">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                                {editing ? (
                                    <select name="gender" value={form.gender} onChange={onChange} className="w-full bg-slate-50 border-b-2 border-slate-200 py-1.5 focus:border-blue-500 outline-none font-medium text-slate-800">
                                        <option value="">Select Gender</option>
                                        {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                ) : <p className="font-semibold text-slate-700">{form.gender || '—'}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-8">
                        <div className="flex gap-5">
                            <div className="mt-1 text-red-400"><Droplets className="w-5 h-5" /></div>
                            <div className="w-full">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Blood Group</p>
                                {editing ? (
                                    <select name="blood_type" value={form.blood_type} onChange={onChange} className="w-full bg-slate-50 border-b-2 border-slate-200 py-1.5 focus:border-blue-500 outline-none font-medium text-slate-800">
                                        <option value="">Select Group</option>
                                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                    </select>
                                ) : <p className="font-semibold text-slate-700">{form.blood_type || '—'}</p>}
                            </div>
                        </div>

                        <EditableField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} editing={editing} onChange={onChange} icon={<Phone className="w-5 h-5 text-emerald-500" />} />

                        <EditableField label="Allergies" name="allergies" value={form.allergies} editing={editing} onChange={onChange} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} />
                    </div>

                    <div className="col-span-full pt-6 border-t border-slate-50 space-y-8">
                        <EditableTextarea label="Home Address" name="address" value={form.address} editing={editing} onChange={onChange} icon={<MapPin className="w-5 h-5 text-slate-400" />} />
                        <EditableTextarea label="Medical Notes" name="notes" value={form.notes} editing={editing} onChange={onChange} icon={<FileText className="w-5 h-5 text-slate-400" />} />
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="bg-slate-50 px-8 py-6 flex justify-between items-center">
                    <button onClick={prevStep} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Previous
                    </button>

                    {/* Dot Progress */}
                    <div className="hidden sm:flex gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`h-2 rounded-full transition-all ${s === 2 ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'}`} />
                        ))}
                    </div>

                    <button
                        onClick={nextStep}
                        disabled={editing}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black shadow-xl transition-all font-bold disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                        Continue <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

/* --- Styled Sub-components --- */

function Field({ label, value, icon }: any) {
    return (
        <div className="flex gap-5">
            <div className="mt-1 text-slate-300">{icon}</div>
            <div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="font-semibold text-slate-800 text-lg">{value || '—'}</p>
            </div>
        </div>
    )
}

function EditableField({ label, editing, icon, ...rest }: any) {
    return (
        <div className="flex gap-5 group">
            <div className="mt-1 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
            <div className="w-full">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                {editing ? (
                    <input className="w-full bg-slate-50 border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1.5 transition-all text-slate-800 font-medium" {...rest} />
                ) : (
                    <p className="font-semibold text-slate-700">{rest.value || '—'}</p>
                )}
            </div>
        </div>
    )
}

function EditableTextarea({ label, editing, icon, ...rest }: any) {
    return (
        <div className="flex gap-5 group">
            <div className="mt-1 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
            <div className="w-full">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                {editing ? (
                    <textarea rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none p-3 transition-all text-slate-800 text-sm" {...rest} />
                ) : (
                    <p className="font-medium text-slate-600 text-sm leading-relaxed max-w-md">{rest.value || 'Not provided'}</p>
                )}
            </div>
        </div>
    )
}