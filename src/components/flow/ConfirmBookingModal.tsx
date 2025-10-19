'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
    User, 
    FileText, 
    Upload, 
    Clock, 
    Calendar, 
    Check, 
    Users, 
    X,
    MinusCircle
} from 'lucide-react'; 
import { useForm, SubmitHandler } from 'react-hook-form'; 

// --- MOCK Data Structures ---
interface Attendee {
    id: string;
    name: string;
}

const MOCK_ATTENDEES: Attendee[] = [
    { id: '1798559871122023774', name: 'John Doe (Husband)' },
    { id: '1798559871111111111', name: 'Jane Smith (Daughter)' }, 
    { id: '1798559872222222222', name: 'Ravi Perera (Brother)' }, 
    { id: '1798559873333333333', name: 'Alia Khan (Mother)' }, 
];

// --- RHF and API Payload Interfaces (Truncated for brevity) ---
interface BookingFormInputs {
    practitioner_id: string; 
    appointment_type_id: string; 
    starts_at: string; 
    ends_at: string; 
    business_id: string; 
    notes: string; 
    attendeeType: 'patient' | 'additional'; 
    patient_id: string; 
    displayDoctorName: string;
    displayPatientName: string;
    uploadDocuments: string; 
}

interface ConfirmedBookingData extends BookingFormInputs {
    additionalAttendeeIds: string[];
}
export interface DoctorProfile {

    name: string;

    specialty: string;

    fee: number;

    currency: string;

}



// --- Props Interface (Truncated for brevity) ---
interface ConfirmBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPatientId: string; 
    initialPatientName: string; 
    initialPractitionerId: string;
    initialDoctorName: string;
    initialAppointmentTypeId: string;
    initialStartsAt: string; 
    initialEndsAt: string; 
    initialBusinessId: string;
     doctorProfile: DoctorProfile; 
     initialSelectedDate: Date | null; // The original Date object
    initialSelectedTimeSlot: string | null; // The original time slot string (e.g., "10:00 AM")
     attendeeCount: number; // New prop from flow
    onFinalSubmit: (data: ConfirmedBookingData) => void;
}

// --- RHF Input/Field Component (No changes) ---
type RHFInputFieldProps = {
    label: string;
    placeholder: string;
    name: keyof BookingFormInputs; 
    register: ReturnType<typeof useForm<BookingFormInputs>>['register'];
    error: string | undefined;
    isTextArea?: boolean;
    isReadOnly?: boolean; 
    isUpload?: boolean;
    isRequired?: boolean;
    icon?: React.ReactNode; 
    children?: React.ReactNode; 
};

const RHFInputField: React.FC<RHFInputFieldProps> = ({
    label,
    placeholder,
    name,
    register,
    error,
    isTextArea = false,
    isReadOnly = false, 
    isUpload = false,
    isRequired = true,
    icon,
    children
}) => {
    
    const baseClasses = `w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-blue-400 focus:border-blue-400 text-gray-800 transition duration-150`;
    const readOnlyClasses = isReadOnly ? 'bg-gray-100 text-gray-600 cursor-default' : 'bg-white';
    const errorClasses = error ? 'border-red-500' : 'border-gray-300'; 
    const inputStyle = isTextArea ? 
        `${baseClasses} min-h-[100px] py-3 ${readOnlyClasses} ${errorClasses}` : 
        `${baseClasses} h-10 ${readOnlyClasses} ${errorClasses}`; 

    return (
        <div className="space-y-1">
            <label htmlFor={name} className="text-sm text-gray-600 font-medium">
                {label}
            </label>
            <div className="relative">
                {children ? children : isTextArea ? (
                    <textarea
                        id={name}
                        placeholder={placeholder}
                        readOnly={isReadOnly}
                        {...register(name, {
                            required: isRequired ? 'Required field' : false,
                        })}
                        className={inputStyle}
                    />
                ) : (
                    <input
                        id={name}
                        type={isUpload ? 'text' : 'text'}
                        placeholder={placeholder}
                        readOnly={isReadOnly || isUpload}
                        {...register(name, {
                            required: isRequired ? 'Required field' : false,
                        })}
                        className={inputStyle}
                    />
                )}
                
                {!children && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        {icon}
                        {isUpload && (
                            <label 
                                htmlFor={`upload-file-input-${name}`}
                                className="pointer-events-auto cursor-pointer text-gray-500 hover:text-blue-500 transition ml-2 p-1"
                            >
                                <Upload size={20} />
                                <input type="file" id={`upload-file-input-${name}`} className="hidden" />
                            </label>
                        )}
                    </div>
                )}
            </div>
            
            {error && isRequired && (
                <p className="text-red-500 font-bold text-xs flex items-center">
                    <span className='mr-1'>!</span>
                    {error}
                </p>
            )}
        </div>
    );
};

// --- Helper Functions for Formatting (No changes) ---
const formatDateTime = (isoString: string): { date: string, time: string } => {
    if (!isoString) return { date: 'N/A', time: 'N/A' };
    try {
        const date = new Date(isoString);
        const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); 
        return { date: formattedDate, time: formattedTime }; 
    } catch {
        return { date: 'N/A', time: 'N/A' };
    }
};

// --- Confirm Booking Modal Component ---
const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({ 
    isOpen, 
    onClose, 
    attendeeCount,
    initialPatientId,
    initialPatientName, 
    initialPractitionerId,
    initialDoctorName,
    initialAppointmentTypeId,
    initialStartsAt,
    initialEndsAt,
    initialBusinessId,
    initialSelectedDate,
    initialSelectedTimeSlot,
        doctorProfile,
    onFinalSubmit 
}) => {
    
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<BookingFormInputs>({
        defaultValues: {
            practitioner_id: initialPractitionerId, 
            appointment_type_id: initialAppointmentTypeId,
            starts_at: initialStartsAt,
            ends_at: initialEndsAt,
            business_id: initialBusinessId,
            notes: '',
            attendeeType: attendeeCount > 1 ? 'additional' : 'patient',
            patient_id: initialPatientId,
            displayDoctorName: initialDoctorName,
            displayPatientName: initialPatientName,
            uploadDocuments: '',
        }
    });

    const attendeeType = watch('attendeeType');
    
    const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);

    // const { date: startDate, time: startTime } = useMemo(() => formatDateTime(initialStartsAt), [initialStartsAt]);
    // const { time: endTime } = useMemo(() => formatDateTime(initialEndsAt), [initialEndsAt]);
    const endTime = useMemo(() => {
        if (!initialEndsAt) return '';
        // Create a new date object from the ISO string
        const date = new Date(initialEndsAt);
        // Format it to local time (HH:MM AM/PM)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, [initialEndsAt]);
    const numAdditionalSlots = attendeeCount - 1;
    useEffect(() => {
        if (numAdditionalSlots > 0 && selectedAttendeeIds.length === 0) {
            // Auto-select the first available attendees up to the count selected in step 1
            const initialSelection = MOCK_ATTENDEES
                .filter(a => a.id !== initialPatientId)
                .slice(0, numAdditionalSlots)
                .map(a => a.id);
            setSelectedAttendeeIds(initialSelection);
        }
    }, [numAdditionalSlots, initialPatientId, selectedAttendeeIds.length]);
    const availableAttendees = useMemo(() => {
        return MOCK_ATTENDEES.filter(
            attendee => attendee.id !== initialPatientId && !selectedAttendeeIds.includes(attendee.id)
        );
    }, [selectedAttendeeIds, initialPatientId]);
    
    const getAttendeeName = useCallback((id: string) => {
        const attendee = MOCK_ATTENDEES.find(a => a.id === id);
        return attendee ? attendee.name : 'Unknown Attendee';
    }, []);

    const handleSelectAttendee = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        if (newId && !selectedAttendeeIds.includes(newId)) {
            setSelectedAttendeeIds(prev => [...prev, newId]);
            e.target.value = "";
        }
    };
    
    const handleRemoveAttendee = (id: string) => {
        setSelectedAttendeeIds(selectedAttendeeIds.filter(aId => aId !== id));
    };
    
    const handleFormConfirm: SubmitHandler<BookingFormInputs> = (data) => {
        const confirmedData: ConfirmedBookingData = {
            ...data,
            additionalAttendeeIds: selectedAttendeeIds, 
        };
        onFinalSubmit(confirmedData);
    };

    // useEffect(() => {
    //     if (attendeeType === 'patient' && selectedAttendeeIds.length > 0) {
    //          setSelectedAttendeeIds([]);
    //     }
    // }, [attendeeType, selectedAttendeeIds]);


    if (!isOpen) {
        return null;
    }

    // CSS style to hide the scrollbar for Webkit browsers (Chrome, Safari)
    const scrollbarHideStyle = {
        msOverflowStyle: 'none',  /* IE and Edge */
        scrollbarWidth: 'none',   /* Firefox */
        WebkitScrollbar: { display: 'none' } // Not directly valid in JSX style prop, but included here for reference. We use -webkit-scrollbar: none; via the `style` object's vendor prefix equivalent below.
    };
    
    // Combining Tailwind classes with inline styles for cross-browser scrollbar hiding
    const modalContentClasses = "w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-2xl transition-transform transform scale-100 opacity-100 max-h-[90vh] overflow-y-auto";

    return createPortal(
        <div 
            className="fixed p-4 inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-opacity-50 transition-opacity" 
            onClick={onClose} 
        >
            
            <div
                className={modalContentClasses}
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'white',
                    border: '1px solid rgba(220, 220, 220, 0.5)',
                    // --- SCROLLBAR HIDING STYLES ADDED HERE ---
                    msOverflowStyle: 'none',  /* IE and Edge */
                    scrollbarWidth: 'none',   /* Firefox */
                    // The common Webkit solution is tricky in inline React styles, but we include 
                    // the other two widely used properties for better coverage. 
                    // For full Webkit support (Chrome/Safari), a dedicated CSS file is typically needed,
                    // but the `scrollbarWidth` and `msOverflowStyle` cover Firefox/IE/Edge.
                }}
            >
                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition z-10"
                    onClick={onClose}
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Confirm Booking</h2>

                <form onSubmit={handleSubmit(handleFormConfirm)} className="space-y-5"> 
                    
                    {/* --- MAIN BOOKING DETAILS (TWO COLUMNS) --- */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                        
                        {/* Column 1 */}
                        <div className="space-y-5">
                            <RHFInputField
                                label="Doctor"
                                placeholder={initialDoctorName}
                                name="displayDoctorName"
                                register={register}
                                error={errors.displayDoctorName?.message}
                                isReadOnly={true}
                                isRequired={true}
                                icon={<Check size={20} className="text-green-500" />}
                            />
                            
                            <RHFInputField
                                label="Date"
                                placeholder={initialSelectedDate ? initialSelectedDate.toLocaleDateString() : 'N/A'}
                                name="starts_at" 
                                register={register}
                                error={errors.starts_at?.message}
                                isReadOnly={true}
                                isRequired={true}
                                icon={<Calendar size={20} className="text-gray-400" />}
                            />
                        </div>
                        
                        {/* Column 2 */}
                        <div className="space-y-5">
                            <RHFInputField
                                label="Service Type"
                                placeholder="General Consultation"
                                name="appointment_type_id" 
                                register={register}
                                error={errors.appointment_type_id?.message}
                                isReadOnly={true}
                                isRequired={true}
                                icon={<Check size={20} className="text-green-500" />}
                            />
                            
                            <RHFInputField
                                label="Time Slot"
                                placeholder={`${initialSelectedTimeSlot} - ${endTime}`}
                                name="ends_at" 
                                register={register}
                                error={errors.ends_at?.message}
                                isReadOnly={true}
                                isRequired={true}
                                icon={<Clock size={20} className="text-gray-400" />}
                            />
                        </div>
                        
                    </div>
                    
                    {/* --- ATTENDEE SELECTION & PRIMARY PATIENT (Full Width) --- */}
                    <div className="border-t pt-5 space-y-4">
                        
                        {/* Primary Patient Name (Always displayed, read-only) */}
                        <RHFInputField
                            label="Primary Patient Name"
                            placeholder={initialPatientName}
                            name="displayPatientName"
                            register={register}
                            error={errors.displayPatientName?.message}
                            isRequired={true}
                            isReadOnly={true} 
                            icon={<User size={20} className="text-blue-500" />}
                        />
                        
                        {/* Radio Buttons for Attendee Type */}
                        <div className='pt-2'>
                            <label className="text-sm text-gray-600 font-medium block mb-2">Who is attending?</label>
                            <div className='flex items-center space-x-6'>
                                <label className="flex items-center space-x-2 text-gray-700 font-medium cursor-pointer">
                                    <input 
                                        type="radio" 
                                        {...register('attendeeType')}
                                        value="patient"
                                        checked={attendeeType === 'patient'}
                                        onChange={() => setValue('attendeeType', 'patient')}
                                        className="form-radio text-blue-500 w-4 h-4"
                                    />
                                    <span>Only Patient</span>
                                </label>
                                
                                <label className="flex items-center space-x-2 text-gray-700 font-medium cursor-pointer">
                                    <input 
                                        type="radio" 
                                        {...register('attendeeType')}
                                        value="additional"
                                        checked={attendeeType === 'additional'}
                                        onChange={() => setValue('attendeeType', 'additional')}
                                        className="form-radio text-blue-500 w-4 h-4"
                                    />
                                    <span>Patient + Others</span>
                                </label>
                            </div>
                        </div>

                        {/* CONDITIONAL MULTI-SELECT DROPDOWN */}
                        {attendeeType === 'additional' && (
                            <div className="space-y-3 pt-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <label className="text-sm text-gray-700 font-medium block mb-2 flex items-center">
                                    <Users size={18} className="mr-2 text-blue-600" />
                                    Select Additional Attendees ({selectedAttendeeIds.length})
                                </label>
                                
                                {/* Multi-Select Dropdown */}
                                <div className="relative">
                                    <select
                                        id="additionalAttendeeSelect"
                                        onChange={handleSelectAttendee}
                                        value=""
                                        className="w-full h-10 px-4 py-2 border rounded-lg shadow-sm focus:ring-blue-400 focus:border-blue-400 text-gray-800 transition duration-150 pr-10 border-gray-300 bg-white"
                                    >
                                        <option value="" disabled>Select family member(s) to add...</option>
                                        {availableAttendees.map(attendee => (
                                            <option key={attendee.id} value={attendee.id}>
                                                {attendee.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Selected Attendee Tags */}
                                {selectedAttendeeIds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selectedAttendeeIds.map(id => (
                                            <span 
                                                key={id} 
                                                className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full"
                                            >
                                                {getAttendeeName(id)}
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveAttendee(id)}
                                                    className="ml-2 text-blue-500 hover:text-blue-700 transition"
                                                    aria-label={`Remove ${getAttendeeName(id)}`}
                                                >
                                                    <MinusCircle size={16} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                {selectedAttendeeIds.length === 0 && (
                                    <p className="text-xs text-gray-500 pt-1">No additional attendees selected.</p>
                                )}
                            </div>
                        )}
                        
                    </div>
                    
                    {/* --- NOTES AND UPLOAD (Full Width) --- */}
                    <div className='pt-2 space-y-4'>
                        <RHFInputField
                            label="Additional Description (Notes)"
                            placeholder="Add notes for your doctor (e.g., symptoms, recent medications)."
                            name="notes"
                            register={register}
                            error={errors.notes?.message}
                            isTextArea={true}
                            isRequired={false}
                        />
                    
                        <RHFInputField
                            label="Upload Documents"
                            placeholder="No file chosen"
                            name="uploadDocuments"
                            register={register}
                            error={errors.uploadDocuments?.message}
                            isRequired={false} 
                            isUpload={true}
                            icon={<FileText size={20} className="text-gray-400" />}
                        />
                    </div>
                    
                    {/* Submit Button (Paynow) */}
                    <div className="relative bottom-0 bg-white pt-4 z-10 flex justify-center shadow-lg"> 
                        <button
                            type="submit"
                            className="w-full py-3 text-white font-bold text-base rounded-lg shadow-md transition duration-200 hover:opacity-90"
                            style={{
                                background: 'rgba(0, 139, 181, 0.89)',
                                boxShadow: '0 2px 8px rgba(0, 113, 147, 0.3)'
                            }}
                        >
                            Pay now
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmBookingModal;