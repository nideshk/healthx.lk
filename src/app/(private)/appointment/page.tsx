// app/appointment/page.tsx
import AppointmentBookingFlow from '@/components/flow/AppointmentBookingFlow';

// Define metadata for the page
// export const metadata: Metadata = {
//     title: 'Book Appointment - Multi-Step Flow',
//     description: 'A single-page, multi-step wizard for selecting attendees, doctor, and booking the appointment.',
// };

/**
 * This component acts as the entry point for the entire appointment booking flow.
 * It renders the main flow component which manages steps and form state (RHF).
 */
export default function AppointmentPage() {
    return (
        // The AppointmentBookingFlow component handles all the rendering logic 
        // for the AttendeeSelection, DoctorSelection, and BookAppointment steps.
        <AppointmentBookingFlow />
    );
}