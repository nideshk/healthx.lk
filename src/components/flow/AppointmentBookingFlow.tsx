"use client";
import React, { useState, useEffect, useRef } from "react";
import ServiceSelectionStep from "./ServiceSelectionStep";
import DoctorSelectionStep from "./DoctorSelectionStep";
import BookAppointmentStep from "./BookAppointmentStep";
import ConsentFormStep from "./ConsentFormStep";
import PreConsultationStep from "./PreConsultationStep";
import PaymentStep from "./PaymentStep";
import ConfirmBookingModal from "./ConfirmBookingModal";
import { AppointmentFormInputs } from "@/types/FormType";
import { toast } from "sonner";

enum Step {
  SERVICE_SELECTION = 0,
  DOCTOR_SELECTION = 1,
  BOOK_APPOINTMENT = 2,
  CONSENT_SIGNING = 3,
  PRE_CONSULTATION = 4,
  PAYMENT = 5,
}

export default function AppointmentBookingFlow() {
  const [draftData, setDraftData] = useState<any>(null); // wrapper: { id, patient_id, data }
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(Step.SERVICE_SELECTION);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const stepRef = useRef<{ validateStep?: () => boolean }>(null);

  const bookingControllerRef = useRef<{
  validatePreConsult?: () => boolean;
  validatePayment?: () => boolean;
  getAttachment?: () => File | null;
}>({});

  const [bookingData, setBookingData] = useState<AppointmentFormInputs>({
    selectedServiceId: "",
    selectedServiceTitle: "",
    attendeeCount: 1,
    appointment_id: "",
    selectedDoctor: null,
    starts_at: new Date().toISOString(),
    ends_at: new Date().toISOString(),
    selectedAttendees: [],
    appointmentType: null,
    consent: {},
    pre_consultation: null,
    payment_status: null,
    selectedService: null,
    last_visited_step: 0,
  });

  const goToStep = (stepNumber: number) => {
  setCurrentStep(stepNumber);
};
  // Hydrate draft on mount
  useEffect(() => {
    async function fetchDraft() {
      try {
        const res = await fetch("/api/booking/appointment/draft");
        const result = await res.json();

        const wrapper = result?.draft || result?.data;
        if (!wrapper) return;

        setDraftData(wrapper);
        const d = wrapper.data || {};
        setBookingData((prev) => ({ ...prev, ...d }));
        setCurrentStep(d?.last_visited_step ?? 0);
      } catch (err) {
        console.error("Failed to fetch draft:", err);
      }
    }
    fetchDraft();
  }, []);

  // updateData writes into in-memory bookingData immediately
  const updateData = (newData: Partial<AppointmentFormInputs>) => {
    setBookingData((prev) => {
      const merged = { ...prev, ...newData };
      return merged;
    });
  };

  // helper to get merged object for saving (always synchronous)
  const getMergedForSave = (overrides?: Partial<AppointmentFormInputs>) => {
    return { ...bookingData, ...(overrides || {}), last_visited_step: currentStep };
  };

  // only send { draft_id?, data } to the API
  const saveDraft = async (dataToSave: any) => {
    const payload = {
      draft_id: draftData?.id ?? null,
      data: dataToSave,
    };
    console.log("💾 Saving draft with payload:", payload);

    const res = await fetch("/api/booking/appointment/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error("Draft save failed: " + text);
    }

    const result = await res.json();
    const wrapper = result?.draft || result?.data;
    if (wrapper) {
      setDraftData(wrapper);
      if (wrapper.data) setBookingData((prev) => ({ ...prev, ...wrapper.data }));
    }
  };

  // nextStep optionally accepts override (ensures fields like consent are included immediately)
  const nextStep = async (opts?: { override?: Partial<AppointmentFormInputs> }) => {
    if (isSaving) return;
    if (stepRef.current?.validateStep && !stepRef.current.validateStep()) {
      toast.error("Please complete required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const merged = getMergedForSave(opts?.override);
      setBookingData(merged);
      await saveDraft(merged);
      toast.success("Progress saved");
      setTimeout(() => setCurrentStep((s) => (s + 1) as Step), 150);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save progress");
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = async (opts?: { override?: Partial<AppointmentFormInputs> }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const merged = getMergedForSave(opts?.override);
      setBookingData(merged);
      await saveDraft(merged);
      setTimeout(() => setCurrentStep((s) => (s - 1) as Step), 150);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save progress");
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
    <div className="min-h-screen pb-28">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {CurrentComponent && (
          <CurrentComponent
            bookingControllerRef={bookingControllerRef}
            nextStep={(override?: any) => nextStep({ override })}
            prevStep={(override?: any) => prevStep({ override })}
            updateData={updateData}
            bookingData={bookingData}
            draftData={draftData}
            goToStep={goToStep}
          />
        )}
      </div>
    </div>
  );
}
