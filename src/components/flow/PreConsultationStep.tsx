'use client';
import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, User, Phone, Mail, Loader2, Paperclip, X } from 'lucide-react';
import { AppointmentFormInputs } from '@/types/FormType';

interface Props {
    nextStep: () => void;
    prevStep: () => void;
    updateData: (data: Partial<AppointmentFormInputs>) => void;
    bookingData: AppointmentFormInputs;
}

const PreConsultationStep = forwardRef(
    ({ nextStep, prevStep, updateData, bookingData }: Props, ref) => {
        // 🔍 Search state
        const [searchQuery, setSearchQuery] = useState('');
        const [searchResults, setSearchResults] = useState<any[]>([]);
        const [loading, setLoading] = useState(false);
        const [attachment, setAttachment] = useState<File | null>(null);
        const searchTimeout = useRef<NodeJS.Timeout | null>(null);

        // 🧠 Extract current data
        const pre = bookingData?.pre_consultation || {};
        const note = pre.note || {};
        const selectedAttendees = bookingData?.selectedAttendees || [];

        // 🔍 Search patients (by name/email/phone)
        const handleSearch = (query: string) => {
            setSearchQuery(query);

            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (!query.trim()) {
                setSearchResults([]);
                return;
            }

            searchTimeout.current = setTimeout(async () => {
                try {
                    setLoading(true);
                    const res = await axios.get(`/api/patient?search=${query}`);
                    setSearchResults(res.data.data || []);
                } catch (err) {
                    console.error('❌ Search failed:', err);
                    toast.error('Error searching patients.');
                } finally {
                    setLoading(false);
                }
            }, 400);
        };

        // 🧾 Field handlers
        const handleChange = (field: 'concern' | 'outcome', value: string) => {
            const updatedNote = { ...note, [field]: value };
            updateData({
                pre_consultation: {
                    ...pre,
                    note: updatedNote,
                },
            });
        };

        const handleReferralChange = (value: string) => {
            updateData({
                pre_consultation: {
                    ...pre,
                    referral: value,
                },
            });
        };

        // 👥 Toggle attendees (store email only)
        const toggleAttendee = (email: string) => {
            const updated = selectedAttendees.includes(email)
                ? selectedAttendees.filter((a) => a !== email)
                : [...selectedAttendees, email];

            updateData({ selectedAttendees: updated });
        };

        // 📎 Handle file upload
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setAttachment(file);
                updateData({
                    pre_consultation: {
                        ...pre,
                        attachment: file.name, // Store file name in draft for reference
                    },
                });
            }
        };

        const removeAttachment = () => {
            setAttachment(null);
            updateData({
                pre_consultation: {
                    ...pre,
                    attachment: null,
                },
            });
        };

        // ✅ Validation for parent
        useImperativeHandle(ref, () => ({
            validateStep: () => {
                const c = note.concern?.trim();
                const o = note.outcome?.trim();
                const r = pre.referral?.trim();
                if (!c || !o || !r) {
                    toast.error('Please fill all pre-consultation fields.');
                    return false;
                }
                if (!selectedAttendees.length) {
                    toast.error('Please select at least one attendee.');
                    return false;
                }
                return true;
            },
        }));

        // 👉 Handle Next
        const handleNext = () => {
            const c = note.concern?.trim();
            const o = note.outcome?.trim();
            const r = pre.referral?.trim();
            if (!c || !o || !r) {
                toast.error('Please fill all pre-consultation fields.');
                return;
            }
            if (!selectedAttendees.length) {
                toast.error('Please select at least one attendee.');
                return;
            }
            nextStep();
        };

        return (
            <div className="py-12 px-6">
                <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
                        Pre-Consultation Details
                    </h2>
                    <p className="text-gray-600 text-center mb-10">
                        Provide pre-consultation details, attach a document (if needed), and add attendees for this appointment.
                    </p>

                    {/* --- FORM SECTION --- */}
                    <div className="grid md:grid-cols-2 gap-6 mb-10">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Main Concern
                            </label>
                            <textarea
                                value={note.concern || ''}
                                onChange={(e) => handleChange('concern', e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="Describe your concern"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Desired Outcome
                            </label>
                            <textarea
                                value={note.outcome || ''}
                                onChange={(e) => handleChange('outcome', e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="What do you hope to achieve?"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                How did you hear about us?
                            </label>
                            <input
                                type="text"
                                value={pre.referral || ''}
                                onChange={(e) => handleReferralChange(e.target.value)}
                                className="w-full border rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Friend / Google / Social Media / Other"
                            />
                        </div>

                        {/* --- File Attachment --- */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Attachment (optional)
                            </label>
                            <div className="flex items-center gap-3">
                                <label
                                    htmlFor="attachment-upload"
                                    className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 text-sm font-medium"
                                >
                                    <Paperclip className="w-4 h-4" />
                                    {attachment ? 'Replace File' : 'Upload File'}
                                </label>
                                <input
                                    id="attachment-upload"
                                    type="file"
                                    accept=".pdf,.jpg,.png,.jpeg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                {attachment && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>{attachment.name}</span>
                                        <button
                                            type="button"
                                            onClick={removeAttachment}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- SIMPLE SEARCHABLE DROPDOWN (Display Name, Store Email) --- */}
                    <div className="mb-10 relative">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                            Select Attendee
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                            Search and select an attendee by name or email.
                        </p>

                        <div className="relative">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Type name or email..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                                />

                                {/* Search Results Dropdown */}
                                {searchQuery && !loading && searchResults.length > 0 && (
                                    <ul className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-md mt-1 w-full max-h-60 overflow-y-auto">
                                        {searchResults.map((p) => (
                                            <li
                                                key={p.email}
                                                onClick={() => {
                                                    // ✅ store only email, display name
                                                    updateData({
                                                        selectedAttendees: [p.email],
                                                        pre_consultation: {
                                                            ...bookingData.pre_consultation,
                                                            selectedAttendeeName: `${p.first_name} ${p.last_name}`,
                                                        },
                                                    });
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                }}
                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
                                            >
                                                <span className="font-medium">
                                                    {p.first_name} {p.last_name}
                                                </span>
                                                <span className="text-gray-500 text-xs ml-1">({p.email})</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Loading indicator */}
                                {loading && (
                                    <div className="absolute top-2 right-3 text-gray-400 text-sm flex items-center gap-1">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    </div>
                                )}

                                {/* No Results */}
                                {searchQuery && !loading && searchResults.length === 0 && (
                                    <div className="absolute z-10 bg-white border border-gray-200 rounded-lg mt-1 w-full p-3 text-sm text-gray-500 italic">
                                        No results found
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Attendee Display */}
                        {bookingData.selectedAttendees?.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-600">Selected Attendee:</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                        {/* ✅ Display name, fallback to email */}
                                        {bookingData?.pre_consultation?.selectedAttendeeName ||
                                            bookingData.selectedAttendees[0]}
                                    </span>
                                    <button
                                        onClick={() =>
                                            updateData({
                                                selectedAttendees: [],
                                                pre_consultation: {
                                                    ...bookingData.pre_consultation,
                                                    selectedAttendeeName: '',
                                                },
                                            })
                                        }
                                        className="text-gray-500 hover:text-red-600 text-xs font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        );
    }
);

PreConsultationStep.displayName = 'PreConsultationStep';
export default PreConsultationStep;
