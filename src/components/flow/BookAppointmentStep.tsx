'use client';
import React, { useState, useMemo } from 'react';
// Assuming AppointmentFormInputs and Doctor are defined in the parent flow component
// import { useFormContext } from 'react-hook-form'; 
import { Star, User, Clock, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react'; 
// --- RHF Interface (Must be defined in your main flow component) ---
// Note: These interfaces are placeholders for your actual RHF structure
interface Doctor { name: string; registration: string; fee: number; currency: string; rating: { overall: number; advice: number; punctuality: number; }; }
interface AppointmentFormInputs {
    selectedDoctor: Doctor | null;
    appointmentDate: Date | null;
    appointmentTimeSlot: string | null;
}
interface BookAppointmentStepProps {
    nextStep: () => void;
    prevStep: () => void;
    updateData: (data: Partial<AppointmentFormInputs>) => void; // New prop
    bookingData: AppointmentFormInputs; // Current data state
}
// --- Interfaces for Strong Typing ---

interface Rating { score: number; label: string; icon: React.ReactNode; }
interface DoctorProfile {
    name: string; specialty: string; registration: string; fee: number; currency: string;
    ratings: { overall: Rating; advice: Rating; punctuality: Rating; };
    about: string; expertise: string[];
}


// Helper to map RHF Doctor to Display Profile
const mapRHFDoctorToProfile = (doctor: Doctor): DoctorProfile => ({
    name: doctor.name,
    specialty: "General Physician", 
    registration: doctor.registration,
    fee: doctor.fee,
    currency: doctor.currency,
    ratings: {
        overall: { score: doctor.rating.overall, label: 'Overall', icon: <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> },

        advice: { score: doctor.rating.advice, label: 'Advice', icon: <User className="w-3 h-3 text-green-500" /> },

        punctuality: { score: doctor.rating.punctuality, label: 'Punctuality', icon: <Clock className="w-3 h-3 text-blue-500" /> },
    },
    // Mock data for display consistency
    about: "Dr. Maria Silva, MD is a compassionate and highly qualified healthcare professional with over 10 years of experience in family medicine and preventive healthcare. She believes in delivering personalized care that focuses on both physical and emotional wellbeing.",
    expertise: [
        "Over 10 years of clinical experience in family and preventive medicine",

        "Former Senior Consultant Physician at CityCare Medical Center (2014 - 2022)",

        "Founder of Silva Wellness Clinic, focused on holistic and lifestyle medicine",

        "Guest lecturer at multiple health and wellness seminars across India",

        "Contributor to leading medical journals and wellness blogs",
    ],
});


// Functional Edit Icon
const CalendarEditIcon = ({ onClick }: { onClick: () => void }) => (
        <button onClick={onClick} className="p-1" title="Clear Date Selection">
         <Edit2 className="w-4 h-4 text-gray-500 hover:text-blue-500 cursor-pointer" />
    </button>
);
const ChevronIcon = ({ direction, onClick }: { direction: 'left' | 'right', onClick: () => void }) => (
    <button type="button" onClick={onClick} className="p-1 rounded-full hover:bg-gray-100 transition">
       {direction === 'left' ? 

            <ChevronLeft className="w-4 h-4 text-gray-700" /> : 

            <ChevronRight className="w-4 h-4 text-gray-700" />

        }
    </button>
);


// --- Calendar Component (Compact and Functional) ---
interface CalendarProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    onDateClear: () => void;
    // For RHF Time Slot Management
    onTimeSelect: (time: string) => void;
    selectedTimeSlot: string | null;
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, onDateClear, onTimeSelect, selectedTimeSlot }) => {
    
    // START: Calendar logic uses current month as a base
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
const initialMonth = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1);

    const [currentMonth, setCurrentMonth] = useState(initialMonth);
    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 for Sunday
    const totalDays = daysInMonth(currentMonth);
    const startingDay = firstDayOfMonth(currentMonth);

    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
    const emptyCells = Array.from({ length: startingDay }, (_, i) => i);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayAbbreviations = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    const handlePrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        newDate.setHours(0, 0, 0, 0); // Normalize time
        onDateSelect(newDate); 
    };

    const formattedSelectedDate = selectedDate 
        ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) 
        : 'Select a date';
    // END: Calendar logic

    // START: Time Slot Logic - Simulates fetching available slots after date selection
    // *** This simulates the 'real-world' fetching based on the selectedDate (or mock data) ***
    const timeSlots = useMemo(() => {
        if (!selectedDate) return [];
        
        // This array should ideally be fetched from an API based on selectedDate and Doctor
        const mockSlots = [
            '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', 
            '12:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
        ];
        
        return mockSlots;
    }, [selectedDate]);
    // END: Time Slot Logic

    return (
        // COMPACT: Reduced padding p-4, smaller shadow
        <div className="p-4 bg-white rounded-xl shadow-md h-full border border-gray-100"> 
            
            {/* Calendar Section */}
            <div className='mb-4'>
                <div className="text-gray-600 font-semibold mb-3 text-xs">Select Date</div>

                {/* Selected Date Header */}
                <div className="flex justify-between items-center pb-3 border-b">
                    <h2 className="text-xl font-extrabold text-gray-900">
                        {formattedSelectedDate}
                    </h2>
                    {/* Functional Edit Icon to Clear Selection */}
 {selectedDate && <CalendarEditIcon onClick={onDateClear} />}          
       </div>

                {/* Month Navigation */}
                <div className="flex justify-between items-center mt-3 mb-3">
                    <div className="flex items-center space-x-1 text-gray-700 font-medium">
                        <span className="font-bold text-sm">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    </div>
                    <div className="flex space-x-0">
                        <ChevronIcon direction="left" onClick={handlePrevMonth} />
                        <ChevronIcon direction="right" onClick={handleNextMonth} />
                    </div>
                </div>

                {/* Days of the Week */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-500 mb-1 text-xs">
                    {dayAbbreviations.map((dayName, index) => (
                        <span key={index}>{dayName}</span> 
                    ))}
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {emptyCells.map((_, i) => (
                        <div key={`empty-${i}`} className="h-7"></div>
                    ))}
                    
                    {days.map(day => {
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        date.setHours(0, 0, 0, 0);
                        
                        const isToday = date.getTime() === today.getTime();
const isCurrentSelected = selectedDate && selectedDate.toDateString() === date.toDateString();                        
                        // Prevent selection of past dates (optional but good practice)
                        const isDisabled = date.getTime() < today.getTime() && !isToday; 

                        return (
                            <button
                                key={day}
                                type="button" 
                                disabled={isDisabled}
                                className={`
                                    h-7 w-7 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition duration-150
                                    ${isCurrentSelected 
                                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-400/30' 
                                        : isDisabled
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : isToday
                                        ? 'border border-green-500 text-green-700 font-bold hover:bg-green-100'
                                        : 'text-gray-800 hover:bg-blue-100'
                                    }
                                `}
                                onClick={() => handleDayClick(day)}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slot Section - Conditional Display */}
            {selectedDate && (
                <div className="mt-4 pt-3 border-t">
                    <h3 className="text-gray-600 font-semibold mb-2 text-xs">Available Time Slots</h3>
                    
                    {timeSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {timeSlots.map((time, index) => (
                                <button 
                                    key={index} 
                                    type="button"
                                    onClick={() => onTimeSelect(time)}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded-lg border transition duration-150
                                        ${selectedTimeSlot === time 
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                                        }
                                    `}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-red-500">No slots available on this date.</p>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Main Book Appointment Component ---

interface BookAppointmentStepProps {
    prevStep: () => void;
}

export default function BookAppointmentStep({ nextStep, prevStep, updateData, bookingData }: BookAppointmentStepProps) {
    // const { watch, setValue, handleSubmit,formState: { errors } } = useFormContext<AppointmentFormInputs>();

    // const selectedDate = watch('appointmentDate');
    // const selectedTimeSlot = watch('appointmentTimeSlot');
    // const rhfSelectedDoctor = watch('selectedDoctor');

    // Default placeholder data if no doctor is selected
//     const defaultDoctor: Doctor = { name: "Kamal Perera", registration: "SLMC-GP-2019-0210", fee: 4000, currency: "LKR", rating: { advice: 4.9, punctuality: 4.7, overall: 4.8 } };

    
    // Use selected doctor from RHF or mock data
    // const doctorProfile = rhfSelectedDoctor 
    //     ? mapRHFDoctorToProfile(rhfSelectedDoctor) 
    //    : mapRHFDoctorToProfile(defaultDoctor);

    const { selectedDoctor, appointmentDate, appointmentTimeSlot } = bookingData;
    
    const doctorProfile: DoctorProfile | null = useMemo(() => 
        selectedDoctor ? mapRHFDoctorToProfile(selectedDoctor) : null, 
        [selectedDoctor]
    );

  const handleDateSelect = (date: Date) => {
        updateData({ appointmentDate: date });
        // Clear time slot if a new date is picked
        if (appointmentDate?.toDateString() !== date.toDateString()) {
             updateData({ appointmentTimeSlot: null });
        }
    };
    const handleDateClear = () => {
        updateData({ appointmentDate: null, appointmentTimeSlot: null });
    };

   const handleTimeSelect = (time: string) => {
        updateData({ appointmentTimeSlot: time });
    };
   const isReadyForConfirmation = appointmentDate && appointmentTimeSlot;
    
    const handleNextStep = () => {
        if (isReadyForConfirmation) {
            nextStep(); // This triggers the Confirm Modal in the parent
        } else {
            // Note: Displaying the manual error message below handles this
        }
    };
    
    const handleGoBackToDoctor = () => {
        prevStep();
    };

    if (!doctorProfile) {
        return (
            <div className="text-center p-10">
                <p className="text-xl text-red-500">Error: No doctor selected. Please go back to the previous step.</p>
                <button onClick={prevStep} className="mt-4 text-blue-500 font-bold">Go Back</button>
            </div>
        );
    }
    return (
        // COMPACT: Reduced max-w to 3xl for a more zoomed-in feel. 
        <div className="min-h-screen bg-white bg-gradient-to-br from-cyan-50 to-blue-50 font-sans"> 
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> 
                
                {/* Back Link and Main Title Block */}
                <div className="flex flex-col items-start mb-5"> 
                    <div className='w-full flex justify-start mb-3'>
                        <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); prevStep(); }}
                            className="text-gray-600 hover:text-gray-800 transition font-medium text-sm flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            <span>Back</span>
                        </button>
                    </div>
                    
                    {/* Title Block */}
                    <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
                        Book Appointment
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Schedule your individual appointment for general consultation
                    </p>
                </div>

                {/* Main Content: Doctor Profile and Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"> {/* Adjusted to 2 columns for compactness */}
                    
                    {/* Column 1: Doctor Profile & Details (Now more compact) */}
                    <div className="lg:col-span-1 bg-white p-5 rounded-xl shadow-md border border-gray-100"> {/* Reduced padding/shadow */}
                        
                        {/* Header: Name and Fee (DYNAMIC) */}
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h2 className="text-xl font-extrabold text-gray-900">{doctorProfile.name}</h2>
                                <p className="text-xs text-gray-600">{doctorProfile.specialty}</p>
                                <p className="text-xs text-gray-500">Reg: {doctorProfile.registration}</p>
                            </div>
                            <p className="text-lg font-bold text-blue-600">
                                {doctorProfile.currency} {doctorProfile.fee.toLocaleString()}
                            </p>
                        </div>

                        {/* Ratings Bar (DYNAMIC) */}
                         <div className="flex space-x-4 items-center border-b pb-3 mb-3">

                                {Object.values(doctorProfile.ratings).map((rating, index) => (

                                    <div key={index} className="flex items-center space-x-1.5">

                                        {rating.icon}

                                        <span className="text-sm font-bold text-gray-800">{rating.score.toFixed(1)}</span>

                                        <span className="text-xs text-gray-500">{rating.label}</span>

                                    </div>

                                ))}

                            </div>

                        {/* About Doctor (DYNAMIC) */}
                         <div className="mb-4">

                                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1 mb-1">

                                    {/* Info Icon */}

                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>

                                    <span>About Dr. {doctorProfile.name.split(' ').pop()}</span>

                                </h3>

                                {/* Adjusted max-h for better flow (Issue 4 resolved) */}

                                <p className="text-xs text-gray-700 leading-relaxed overflow-hidden">

                                    {doctorProfile.about}

                                </p>

                            </div>

                        {/* Experience & Expertise (DYNAMIC) */}
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1 mb-1">
                                <span role="img" aria-label="briefcase" className="text-sm">💼</span>
                                <span>Expertise</span>
                            </h3>
                            <ul className="list-disc pl-4 space-y-0.5 text-xs text-gray-700">
                                {doctorProfile.expertise.slice(0, 3).map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                                {doctorProfile.expertise.length > 3 && <li>...</li>}
                            </ul>
                        </div>
                        
                        {/* Confirmation/Back Buttons - Small and side-by-side */}
                        <div className="mt-4 pt-3 border-t flex justify-between items-center">
                            
                            
                            
                            {/* Confirm Booking Button - Should be type="submit" in the RHF context */}
                            <button 
                                // This button triggers the RHF onSubmit in the parent flow component
                                onClick={handleNextStep}
                                disabled={!isReadyForConfirmation}
                                className={`py-2 px-3 font-bold text-sm rounded-lg transition-all duration-200 
                                    ${isReadyForConfirmation
                                      ? 'bg-blue-500 shadow-lg shadow-blue-400/50 hover:bg-blue-600'
                                        : 'bg-gray-400 cursor-not-allowed'
                                    }
                                `}
                            >
                                Confirm Booking
                            </button>
                        </div>
                        
                    </div>
                    
                    {/* Column 2: Calendar Selector */}
                    <div className="lg:col-span-1">
                        <Calendar
                          selectedDate={appointmentDate} 
                            onDateSelect={handleDateSelect}
                            onDateClear={handleDateClear}
                            onTimeSelect={handleTimeSelect}
                            selectedTimeSlot={appointmentTimeSlot}
                        />
                    </div>
                </div>
                
                {/* RHF Error Display for visibility */}
               {!isReadyForConfirmation && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                        <p className="font-semibold">Booking Error:</p>
                     {!appointmentDate && <p>- Please select an appointment date.</p>}
                        {appointmentDate && !appointmentTimeSlot && <p>- Please select a time slot.</p>}</div>
                )}
            </div>
        </div>
    );
}