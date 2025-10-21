'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // ✅ new
import AttendeeSelectionStep from './AttendeeSelectionStep';
import DoctorSelectionStep from './DoctorSelectionStep';
import BookAppointmentStep from './BookAppointmentStep';
import ConfirmBookingModal from './ConfirmBookingModal';
import ServiceSelectionStep from './ServiceSelectionStep';

export interface Doctor {
  name: string;
  registration: string;
  fee: number;
  currency: string;
  rating: { advice: number; punctuality: number; overall: number };
}

export interface AppointmentFormInputs {
  selectedServiceId: string;
  selectedServiceTitle: string;
  attendeeCount: number;
  selectedDoctor: Doctor | null;
  appointmentDate: Date | null;
  appointmentTimeSlot: string | null;
  initialPatientId: string;
  initialPatientName: string;
  selectedAttendees: string[]; // ✅ array of related patient IDs
  initialAppointmentTypeId: string;
}

enum Step {
  SERVICE_SELECTION = 0,
  ATTENDEE_SELECTION = 1,
  DOCTOR_SELECTION = 2,
  BOOK_APPOINTMENT = 3,
}

export default function AppointmentBookingFlow() {
  const searchParams = useSearchParams();
  const serviceIdFromUrl = searchParams.get('service_id');
  const serviceTitleFromUrl = searchParams.get('service_title');

  const [currentStep, setCurrentStep] = useState<Step>(Step.SERVICE_SELECTION);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [bookingData, setBookingData] = useState<AppointmentFormInputs>({
    selectedServiceId: serviceIdFromUrl || '',
    selectedServiceTitle: serviceTitleFromUrl || 'General Consultation',
    attendeeCount: 1,
    selectedDoctor: null,
    selectedAttendees : ["1"],
    appointmentDate: null,
    appointmentTimeSlot: null,
    initialPatientId: 'P_12345',
    initialPatientName: 'A. User',
    initialAppointmentTypeId: 'T_67890',
  });

  // Keep URL in sync (if user refreshes)
  useEffect(() => {
    if (serviceIdFromUrl) {
      setBookingData((prev) => ({
        ...prev,
        selectedServiceId: serviceIdFromUrl,
        selectedServiceTitle: serviceTitleFromUrl || prev.selectedServiceTitle,
      }));
    }
  }, [serviceIdFromUrl, serviceTitleFromUrl]);

  const updateData = (newData: Partial<AppointmentFormInputs>) => {
    setBookingData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    if (currentStep === Step.BOOK_APPOINTMENT) setIsModalOpen(true);
    else setCurrentStep((prev) => (prev + 1) as Step);
  };

  const prevStep = () => setCurrentStep((prev) => (prev - 1) as Step);

  const resetFlow = () => {
    setCurrentStep(Step.ATTENDEE_SELECTION);
    setBookingData((prev) => ({
      ...prev,
      selectedDoctor: null,
      appointmentDate: null,
      appointmentTimeSlot: null,
    }));
  };

  const stepComponents: Record<Step, React.FC<any>> = {
    [Step.SERVICE_SELECTION] : ServiceSelectionStep,
    [Step.ATTENDEE_SELECTION]: AttendeeSelectionStep,
    [Step.DOCTOR_SELECTION]: DoctorSelectionStep,
    [Step.BOOK_APPOINTMENT]: BookAppointmentStep,
  };

  const CurrentComponent = stepComponents[currentStep];

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {CurrentComponent && (
          <CurrentComponent
            nextStep={nextStep}
            prevStep={prevStep}
            updateData={updateData}
            bookingData={bookingData}
          />
        )}

        <ConfirmBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          bookingData={bookingData}
          resetFlow={resetFlow}
        />
      </div>
    </div>
  );
}
