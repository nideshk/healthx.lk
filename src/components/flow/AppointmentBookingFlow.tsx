
"use client";

import React, { useEffect, useRef, useState } from "react";
import ServiceSelectionStep from "./ServiceSelectionStep";
import DoctorSelectionStep from "./DoctorSelectionStep";
import BookAppointmentStep from "./BookAppointmentStep";
import ConsentFormStep from "./ConsentFormStep";
import PreConsultationStep from "./PreConsultationStep";
import PaymentStep from "./PaymentStep";
import ConfirmBookingModal from "./ConfirmBookingModal";
import ProfileConfirmation from "./ProfileConfirmation";

import { AppointmentFormInputs } from "@/types/FormType";
import { useBookingDraftStore } from "@/stores/useBookingDraftStore";
import { syncAppointmentDraft } from "@/lib/syncAppointmentDraft";
import { useDraftSyncLifecycle } from "@/hooks/useDraftSyncLifecycle";

enum Step {
  SERVICE_SELECTION = 0,
  DOCTOR_SELECTION = 1,
  BOOK_APPOINTMENT = 2,
  PROFILE_CONFIRMATION = 3,
  CONSENT_SIGNING = 4,
  PRE_CONSULTATION = 5,
  PAYMENT = 6,
}

export default function AppointmentBookingFlow() {
  const [currentStep, setCurrentStep] = useState<Step>(Step.SERVICE_SELECTION);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stepRef = useRef<{ validateStep?: () => boolean }>(null);
  const bookingControllerRef = useRef<{
    validateStep?: () => boolean;
    getAttachment?: () => File | null;
  }>({});

  const {
    data: bookingData,
    update,
    hydrate,
    hydrated,
  } = useBookingDraftStore();

  // hydrate local draft
  useEffect(() => {
    hydrate();
  }, []);

  useDraftSyncLifecycle();

  // restore last step
  useEffect(() => {
    if (hydrated && bookingData.last_visited_step !== undefined) {
      setCurrentStep(bookingData.last_visited_step as Step);
    }
  }, [hydrated]);

  if (!hydrated) return null;

  const updateData = (partial: Partial<AppointmentFormInputs>) => {
    update(partial);
    syncAppointmentDraft();
  };

  const nextStep = () => {
    if (stepRef.current?.validateStep && !stepRef.current.validateStep()) {
      return;
    }

    update({ last_visited_step: currentStep + 1 });
    syncAppointmentDraft();
    setCurrentStep((s) => (s + 1) as Step);
  };

  const prevStep = () => {
    update({ last_visited_step: currentStep - 1 });
    syncAppointmentDraft();
    setCurrentStep((s) => (s - 1) as Step);
  };

  const stepComponents: Record<Step, React.FC<any>> = {
    [Step.SERVICE_SELECTION]: ServiceSelectionStep,
    [Step.PROFILE_CONFIRMATION]: ProfileConfirmation,
    [Step.DOCTOR_SELECTION]: DoctorSelectionStep,
    [Step.BOOK_APPOINTMENT]: BookAppointmentStep,
    [Step.CONSENT_SIGNING]: ConsentFormStep,
    [Step.PRE_CONSULTATION]: PreConsultationStep,
    [Step.PAYMENT]: PaymentStep,
  };

  const CurrentStepComponent = stepComponents[currentStep];

  return (
    <>
      <CurrentStepComponent
        ref={stepRef}
        bookingData={bookingData}
        updateData={updateData}
        nextStep={nextStep}
        prevStep={prevStep}
        goToStep={setCurrentStep}
        bookingControllerRef={bookingControllerRef}
        openConfirmModal={() => setIsModalOpen(true)}
      />

      <ConfirmBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingData={bookingData}
        resetFlow={async () => {
          await useBookingDraftStore.getState().reset();
          setCurrentStep(Step.SERVICE_SELECTION);
        }}
        updateData={updateData}
      />
    </>
  );
}
