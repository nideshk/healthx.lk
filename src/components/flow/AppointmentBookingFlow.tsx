// components/flow/AppointmentBookingFlow.tsx
'use client';
import React, { useState,useEffect } from 'react';
// Removed: useForm, FormProvider
// Removed: import from 'react-hook-form'

// Import the step components
import AttendeeSelectionStep from './AttendeeSelectionStep';
import DoctorSelectionStep from './DoctorSelectionStep';
import BookAppointmentStep from './BookAppointmentStep';
import ConfirmBookingModal, { DoctorProfile } from './ConfirmBookingModal';


// --- 1. Define the overall Data Structure ---
export interface Doctor {
    name: string;
    registration: string;
    fee: number;
    currency: string;
    rating: {
        advice: number;
        punctuality: number;
        overall: number;
    };
}

// Data type for the central state object
export type AppointmentFormInputs = {
    selectedServiceTitle: string;
    attendeeCount: number;
    selectedDoctor: Doctor | null;
    appointmentDate: Date | null;
    appointmentTimeSlot: string | null;
    // Mock data needed for the final modal payload
    initialPatientId: string;
    initialPatientName: string;
    initialAppointmentTypeId: string;
};


// --- 2. Step Management Enum ---

enum Step {
    ATTENDEE_SELECTION = 1,
    DOCTOR_SELECTION = 2,
    BOOK_APPOINTMENT = 3,
}


// --- 3. Main Parent Component (The 'Wizard') ---

export default function AppointmentBookingFlow() {
    const [currentStep, setCurrentStep] = useState<Step>(Step.ATTENDEE_SELECTION);
    const [isModalOpen, setIsModalOpen] = useState(false);
// Check session storage on initialization to set the default service title
    const initialServiceTitle = typeof window !== 'undefined' 
        ? sessionStorage.getItem('selectedConsultationService') || 'General Consultation'
        : 'General Consultation'; // Fallback for Server-Side Rendering
    // --- Central State Management (REPLACING RHF) ---
    const [bookingData, setBookingData] = useState<AppointmentFormInputs>({
        selectedServiceTitle: initialServiceTitle,
        attendeeCount: 1, // Defaulting to 1
        selectedDoctor: null,
        appointmentDate: null,
        appointmentTimeSlot: null,
        // Mock data
        initialPatientId: 'P_12345', 
        initialPatientName: 'A. User',
        initialAppointmentTypeId: 'T_67890',
    });
        useEffect(() => {
        if (typeof window !== 'undefined' && sessionStorage.getItem('selectedConsultationService')) {
            sessionStorage.removeItem('selectedConsultationService');
        }
    }, []); // Run once on component mount
    
    // Universal function to update any part of the booking data
    const updateData = (newData: Partial<AppointmentFormInputs>) => {
        setBookingData(prev => ({ ...prev, ...newData }));
    };

    // --- Step Navigation Functions ---
    const nextStep = () => {
        // If the next step is the last one (Book Appointment), open the modal instead
        if (currentStep === Step.BOOK_APPOINTMENT) {
            setIsModalOpen(true);
        } else {
            setCurrentStep(prev => Math.min(prev + 1, Step.BOOK_APPOINTMENT) as Step);
        }
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, Step.ATTENDEE_SELECTION) as Step);
        window.scrollTo(0, 0);
    };

    // --- Step Component Mapping ---
    const stepProps = { 
        nextStep, 
        prevStep, 
        updateData, 
        bookingData,
    };
    
    const stepsComponents: Record<Step, React.FC<any>> = {
        [Step.ATTENDEE_SELECTION]: AttendeeSelectionStep,
        [Step.DOCTOR_SELECTION]: DoctorSelectionStep,
        [Step.BOOK_APPOINTMENT]: BookAppointmentStep,
    };
    
    const CurrentComponent = stepsComponents[currentStep];

    let startsAt = '';
    let endsAt = '';

    if (bookingData.appointmentDate && bookingData.appointmentTimeSlot) {
        
        // 1. Get the local date string (YYYY-MM-DD)
        // This avoids the time zone conversion that shifts the date.
        const datePart = bookingData.appointmentDate.toISOString().split('T')[0];
        
        // 2. Convert 12-hour time slot (e.g., "10:00 AM") to 24-hour time (e.g., "10:00")
        const [time, period] = bookingData.appointmentTimeSlot.split(' ');
        let [hoursStr, minutesStr] = time.split(':');
        let hours = parseInt(hoursStr);
        
        if (period === 'PM' && hours < 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            // Midnight edge case
            hours = 0; 
        }
        const timePart24H = `${hours.toString().padStart(2, '0')}:${minutesStr}`;
        
        // 3. Combine date and time, and treat it as a local time (appending Z means UTC, 
        // which will still cause shifts, so we must rely on the backend to handle the local time string).
        // Best practice is to send a fully specified ISO string with the timezone offset, 
        // but for a quick fix, we'll combine the parts and let the modal handle the display.
        
        // A simple combined date-time string (still risky, but better than the previous ISO() shift)
        // A better approach is to pass the datePart and timePart24H separately to the modal 
        // and let the modal reconstruct the display parts.
        
        // We will send a UTC time that *looks* like the local time to mitigate the shift:
        startsAt = `${datePart}T${timePart24H}:00.000Z`;

        // Mock end time calculation (start time + 30 mins)
        // Note: Creating a Date object and then adjusting it is still the best way to calculate the end time.
        // We'll create a date object using the local time and then convert it back.
        const startDateTime = new Date(`${datePart}T${timePart24H}:00`); // Creates a Date object in the local timezone
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // Add 30 minutes
        
        // Use the local-time-based ISO string for the end time, but truncate the Z
        // to avoid timezone issues when displaying the time slot range.
        endsAt = endDateTime.toISOString(); 
    }

    // --- Prepare props for ConfirmBookingModal ---
    // Simulates calculating the required ISO dates for the modal payload
    // const startsAt: string = bookingData.appointmentDate && bookingData.appointmentTimeSlot 
    //     ? `${bookingData.appointmentDate.toISOString().split('T')[0]}T${
    //         // Simple conversion of 12-hour time slot to 24-hour time (needs robust logic for production)
    //         bookingData.appointmentTimeSlot.includes('PM') && !bookingData.appointmentTimeSlot.startsWith('12')
    //             ? (parseInt(bookingData.appointmentTimeSlot.split(':')[0]) + 12).toString().padStart(2, '0')
    //             : bookingData.appointmentTimeSlot.split(' ')[0]
    //     }:00.000Z`
    //     : '';
        
    // // Mock end time calculation (e.g., start time + 30 mins)
    // const endsAt: string = startsAt ? new Date(new Date(startsAt).getTime() + 30 * 60000).toISOString() : '';
    
    // // Prepare DoctorProfile needed for the Modal UI
    const doctorProfile: DoctorProfile | null = bookingData.selectedDoctor ? {
        name: bookingData.selectedDoctor.name,
        specialty: "General Physician", 
        fee: bookingData.selectedDoctor.fee,
        currency: bookingData.selectedDoctor.currency,
    } : null;
    
    // // Final submission handler
    const handleFinalSubmit = (data: any) => {
        console.log('Final Booking API Payload:', data);
        alert(`Booking Confirmed for ${data.displayPatientName} with ${data.displayDoctorName} on ${bookingData.appointmentDate?.toLocaleDateString()} at ${bookingData.appointmentTimeSlot}!`);
        setIsModalOpen(false);
        setCurrentStep(Step.ATTENDEE_SELECTION); // Reset flow
    };


    return (
        // Removed FormProvider and <form> tag to prevent nested form issue
        <div className="min-h-screen bg-blue-50 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Render the component corresponding to the current step */}
                {CurrentComponent && <CurrentComponent {...stepProps} />}
                
                {/* Display Confirm Modal - Conditionals ensure all required data is present */}
               {isModalOpen && doctorProfile && bookingData.selectedDoctor && (
                    <ConfirmBookingModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        // Pass all collected data as props to ConfirmModal
                        attendeeCount={bookingData.attendeeCount}
                        doctorProfile={doctorProfile}
                        initialPatientId={bookingData.initialPatientId}
                        initialPatientName={bookingData.initialPatientName}
                        initialPractitionerId={bookingData.selectedDoctor.registration} 
                        initialDoctorName={bookingData.selectedDoctor.name}
                        initialAppointmentTypeId={bookingData.initialAppointmentTypeId}
                        // FIX: Pass the originally selected Date object and Time Slot string
                        initialSelectedDate={bookingData.appointmentDate} // NEW PROP
                        initialSelectedTimeSlot={bookingData.appointmentTimeSlot} // NEW PROP
                        // Pass the calculated ISO strings for the backend payload
                        initialStartsAt={startsAt} 
                        initialEndsAt={endsAt}
                        initialBusinessId="B_101" 
                        onFinalSubmit={handleFinalSubmit}
                    />
                )}
            </div>
        </div>
    );
}