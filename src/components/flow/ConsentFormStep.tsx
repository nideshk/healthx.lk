"use client";
import React, { useState, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";

interface Props {
  nextStep: (override?: Partial<AppointmentFormInputs>) => void;
  prevStep: (override?: Partial<AppointmentFormInputs>) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

const ConsentFormStep = forwardRef(({ nextStep, prevStep, updateData, bookingData }: Props, ref) => {
  const [consent, setConsent] = useState({
    telehealth: bookingData?.consent?.telehealth || false,
    terms: bookingData?.consent?.terms || false,
  });

  useImperativeHandle(ref, () => ({
    validateStep: () => {
      if (!consent.telehealth || !consent.terms) {
        toast.error("You must agree to all consent terms before continuing.");
        return false;
      }
      return true;
    },
  }));

  const allChecked = consent.telehealth && consent.terms;

  const handleContinue = () => {
    if (!allChecked) {
      toast.error("Please agree to both consents before proceeding.");
      return;
    }

    // update local bookingData state for UI consistency
    updateData({ consent });

    // But ensure the save uses the fresh consent immediately by passing it as override
    nextStep({ consent });
  };

  return (
    <div className="flex flex-col justify-center py-12 px-4 sm:px-8 bg-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
        <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Consent & Terms</h2>
        <p className="text-gray-600 text-center mb-8">Please review and accept the following documents to proceed with your appointment.</p>

        <div className="mb-8 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Telehealth Consent
          </h3>
          <div className="bg-blue-50 rounded-md p-4 text-sm text-gray-700 leading-relaxed">
            <p className="font-semibold mb-2">TELEHEALTH CONSENT FORM</p>
            <p className="mb-2">By agreeing to this telehealth consent, you acknowledge and agree to the following:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li><strong>Nature of Telehealth Services:</strong> Telehealth involves the use of electronic communications to enable healthcare providers to diagnose, consult, treat, and educate patients using telecommunications technology such as video conferencing, internet, and forward technology.</li>
              <li><strong>Risks and Benefits:</strong> You understand the potential risks and benefits associated with telehealth and consent to receive healthcare services virtually.</li>
            </ol>
          </div>

          <label className="flex items-center gap-3 mt-4 cursor-pointer text-gray-700">
            <input type="checkbox" checked={consent.telehealth} onChange={(e) => setConsent((p) => ({ ...p, telehealth: e.target.checked }))} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
            <span className="text-sm font-medium">I Accept the Telehealth Consent</span>
          </label>
        </div>

        <div className="mb-10 border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            Terms and Conditions
          </h3>

          <div className="bg-blue-50 rounded-md p-4 text-sm text-gray-700 leading-relaxed">
            <p className="font-semibold mb-2">TERMS AND CONDITIONS</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li><strong>Appointment Booking and Cancellation:</strong>
                <ul className="list-disc ml-5 mt-1">
                  <li>Appointments must be cancelled at least 24 hours in advance.</li>
                  <li>No-show appointments may be subject to cancellation fees.</li>
                  <li>Rescheduling is subject to provider availability.</li>
                </ul>
              </li>
              <li><strong>Payment Terms:</strong>
                <ul className="list-disc ml-5 mt-1">
                  <li>Payment is due at the time of service.</li>
                  <li>We accept various payment methods as displayed.</li>
                </ul>
              </li>
            </ol>
          </div>

          <label className="flex items-center gap-3 mt-4 cursor-pointer text-gray-700">
            <input type="checkbox" checked={consent.terms} onChange={(e) => setConsent((p) => ({ ...p, terms: e.target.checked }))} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
            <span className="text-sm font-medium">I Agree to the Terms and Conditions</span>
          </label>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={handleContinue} disabled={!allChecked} className={`px-8 py-3 rounded-lg font-semibold transition ${allChecked ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-200 text-gray-400 cursor-not-allowed"}`}>
            Let’s Finalise the Appointment
          </button>

          <button onClick={() => prevStep()} className="px-8 py-3 rounded-lg font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">
            I Do Not Agree
          </button>
        </div>
      </div>
    </div>
  );
});

ConsentFormStep.displayName = "ConsentFormStep";
export default ConsentFormStep;
