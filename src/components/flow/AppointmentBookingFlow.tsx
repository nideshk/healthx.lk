'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AttendeeSelectionStep from './AttendeeSelectionStep';
import DoctorSelectionStep from './DoctorSelectionStep';
import BookAppointmentStep from './BookAppointmentStep';
import ConfirmBookingModal from './ConfirmBookingModal';
import ServiceSelectionStep from './ServiceSelectionStep';
import ConsentFormStep from './ConsentFormStep';
import PreConsultationStep from './PreConsultationStep';
import PaymentStep from './PaymentStep';
import { AppointmentFormInputs } from '@/types/FormType';
import { toast } from 'sonner';

enum Step {
  SERVICE_SELECTION = 0,
  DOCTOR_SELECTION = 1,
  BOOK_APPOINTMENT = 2,
  CONSENT_SIGNING = 3,
  PRE_CONSULTATION = 4,
  PAYMENT = 5,
}

export default function AppointmentBookingFlow() {
  const [draftData, setDraftData] = useState<any>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [currentStep, setCurrentStep] = useState<Step>(draftData?.last_visited_step || Step.SERVICE_SELECTION);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const stepRef = useRef<{ validateStep?: () => boolean }>(null);
  console.log(currentStep);
  const [bookingData, setBookingData] = useState<AppointmentFormInputs>({
    selectedServiceId:  '',
    selectedServiceTitle:  '',
    attendeeCount: 1,
    selectedDoctor: null,
    starts_at: new Date().toISOString(),
    ends_at: new Date().toISOString(),
    selectedAttendees: [],
    appointmentType: null,
    consent: null,
    pre_consultation: null,
    payment_status: null,
    selectedService : null,
    last_visited_step: 0,
  });
useEffect(() => {
  async function fetchDraftData() {
    try {
      const response = await fetch('/api/appointment/draft');
      const result = await response.json();

      if (result.data) {
        const draft = result.data.data; // since your API stores draft inside `data`
        setDraftData(result.data.data);

        // 🧠 Map draft into bookingData cleanly
        setBookingData((prev) => ({
          ...prev,
          selectedServiceId: draft.selectedService.id || prev.selectedServiceId,
          selectedServiceTitle: draft.selectedServiceTitle || prev.selectedServiceTitle,
          attendeeCount: draft.attendeeCount || prev.attendeeCount,
          selectedDoctor: draft.selectedDoctor || prev.selectedDoctor,
          starts_at: draft.starts_at || prev.starts_at,
          ends_at: draft.ends_at || prev.ends_at,
          selectedAttendees: draft.selectedAttendees || prev.selectedAttendees,
          appointmentType: draft.appointmentType || prev.appointmentType,
          consent: draft.consent || prev.consent,
          pre_consultation: draft.pre_consultation || prev.pre_consultation,
          payment_status: draft.payment_status || prev.payment_status,
          selectedService: draft.selectedService || prev.selectedService,
        }));
        setCurrentStep(draft.last_visited_step);

        console.log('✅ Hydrated bookingData from draft:', draft);
      }
    } catch (error) {
      console.error('❌ Error fetching draft data:', error);
    }
  }

  fetchDraftData();
}, []);


 

 console.log('Current Booking Data:', bookingData);

  const updateData = (newData: Partial<AppointmentFormInputs>) => {
    setBookingData((prev) => ({ ...prev, ...newData }));
  };

const nextStep = async () => {
  if (isSaving) return; // 🚫 Prevent spam clicks
  if (stepRef.current?.validateStep && !stepRef.current.validateStep()) {
    toast.error('Please complete all required fields before proceeding.');
    return;
  }

  setIsSaving(true); // 🔒 Lock navigation

  try {
    const newBookingData = { ...bookingData, last_visited_step: currentStep };
    updateData(newBookingData);

    const hasDraft = !!draftData?.id;
    const payload = hasDraft
      ? { updates: newBookingData, draft_id: draftData.id }
      : { data: newBookingData };
    const method = hasDraft ? 'PATCH' : 'POST';

    const res = await fetch('/api/appointment/draft', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        selectedAttendees: [],
        pre_consultation: null,
      }),
    });

    if (!res.ok) throw new Error('Failed to save draft');

    const result = await res.json();
    const savedDraft = result?.data?.data || result?.draft?.data;
    if (savedDraft) setDraftData(savedDraft);

    toast.success('Progress saved ✅');

    // ⏳ Small delay before step change to ensure DB sync
    setTimeout(() => {
      setCurrentStep((prev) => (prev + 1) as Step);
    }, 200);
  } catch (err) {
    console.error('❌ Error saving draft:', err);
    toast.error('Could not save progress.');
  } finally {
    setIsSaving(false); // 🔓 Unlock
  }
};

const prevStep = async () => {
  if (isSaving) return; // 🚫 Prevent spam clicks

  setIsSaving(true);

  try {
    updateData({ last_visited_step: currentStep });

    const hasDraft = !!draftData?.id;
    const payload = hasDraft
      ? { updates: bookingData, draft_id: draftData.id }
      : { data: bookingData };
    const method = hasDraft ? 'PATCH' : 'POST';

    const res = await fetch('/api/appointment/draft', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        selectedAttendees: [],
        pre_consultation: null,
      }),
    });

    if (!res.ok) throw new Error('Failed to save draft');
    const result = await res.json();
    if (result.data || result.draft) {
      setDraftData(result.data || result.draft);
    }

    setTimeout(() => {
      setCurrentStep((prev) => (prev - 1) as Step);
    }, 200);
  } catch (err) {
    console.error('❌ Error saving draft before going back:', err);
    toast.error('Could not save progress.');
  } finally {
    setIsSaving(false);
  }
};



  const stepComponents: Record<Step, React.FC<any>> = {
    [Step.SERVICE_SELECTION]: ServiceSelectionStep,
    [Step.DOCTOR_SELECTION]: DoctorSelectionStep,
    [Step.BOOK_APPOINTMENT]: BookAppointmentStep,
    [Step.CONSENT_SIGNING]: ConsentFormStep,
    [Step.PRE_CONSULTATION]: PreConsultationStep,
    [Step.PAYMENT]: PaymentStep,
  };

  const CurrentComponent = stepComponents[currentStep];

  return (
    <div className=" bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {CurrentComponent && (
          <CurrentComponent
            ref={stepRef} // ✅ pass ref so parent can call validateStep()
            nextStep={nextStep}
            prevStep={prevStep}
            updateData={updateData}
            bookingData={bookingData}
            draftData={draftData}
          />
        )}

        {/* --- Flow Navigation Bar --- */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 py-4 px-6 flex items-center justify-between shadow-md">
          {/* Step info */}
          <div className="text-sm sm:text-base text-gray-600 font-medium">
            Step <span className="text-blue-600 font-semibold">{currentStep + 1}</span> of {Object.keys(Step).length / 2}:{' '}
            <span className="capitalize">{Step[currentStep].replace('_', ' ').toLowerCase()}</span>
          </div>

          {/* Button group */}
          <div className="flex items-center gap-3">
           <button
  onClick={prevStep}
  disabled={currentStep === Step.SERVICE_SELECTION || isSaving}
  className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 ${
    currentStep === Step.SERVICE_SELECTION || isSaving
      ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
  }`}
>
  ← Back
</button>

<button
  onClick={nextStep}
  disabled={isSaving}
  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${
    isSaving
      ? 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-600'
      : currentStep === Step.PAYMENT
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white'
  }`}
>
  {isSaving ? 'Saving...' : currentStep === Step.PAYMENT ? 'Finish' : 'Next →'}
</button>

          </div>
        </div>

        <ConfirmBookingModal
          resetFlow={()=>{}}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          bookingData={bookingData}
          updateData={updateData}
        />
      </div>
    </div>
  );
}
