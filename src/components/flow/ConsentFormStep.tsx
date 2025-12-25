"use client";

import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";
import { redirect } from "next/navigation";

interface Props {
  nextStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

const ConsentFormStep = forwardRef(
  ({ nextStep, prevStep, updateData, bookingData }: Props, ref) => {
    const [consent, setConsent] = useState({
      telehealth: bookingData?.consent?.telehealth || false,
      terms: bookingData?.consent?.terms || false,
    });

    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [telehealthRead, setTelehealthRead] = useState(false);
    const [termsRead, setTermsRead] = useState(false);

    const telehealthRef = useRef<HTMLDivElement>(null);
    const termsRef = useRef<HTMLDivElement>(null);

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
      updateData({ consent });
      nextStep({ override: { consent } });
    };

    const handleScrollCheck = (
      ref: React.RefObject<HTMLDivElement | null>,
      setter: (v: boolean) => void
    ) => {
      if (!ref.current) return;
      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setter(true);
      }
    };

    return (
      <>
        {/* ================= DECLINE MODAL ================= */}
        {showDeclineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex gap-3">
                <XCircle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Why is consent required?
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Telehealth consent is legally required to:
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 space-y-1">
                    <li>Enable secure virtual medical consultations</li>
                    <li>Protect your privacy and medical rights</li>
                    <li>Ensure compliance with healthcare regulations</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    Without consent, we cannot proceed with this appointment.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => {
                    setShowDeclineModal(false);
                    redirect("/dashboard")
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Exit Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MAIN PAGE ================= */}
        <div className="min-h-screen bg-blue-50 py-12 px-4 sm:px-8 flex justify-center">
          <div className="max-w-4xl w-full bg-white shadow-lg rounded-2xl p-8 border">
            <h2 className="text-3xl font-bold text-gray-800 text-center">
              Consent & Terms
            </h2>
            <p className="text-gray-600 text-center mt-2 mb-8">
              Please read and accept the following documents to proceed.
            </p>

            {/* TELEHEALTH CONSENT */}
            <div className="mb-8 border rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5" />
                Telehealth Consent
              </h3>

              <div
                ref={telehealthRef}
                onScroll={() =>
                  handleScrollCheck(telehealthRef, setTelehealthRead)
                }
                className="h-56 overflow-y-auto bg-blue-50 rounded-md p-4 text-sm text-gray-700 space-y-4"
              >
                <p className="font-semibold">Telehealth Informed Consent</p>

                <p>
                  Telehealth involves the delivery of healthcare services using
                  electronic communication technologies such as video calls,
                  audio calls, messaging platforms, and secure portals.
                </p>

                <p>
                  Participation is voluntary. You may discontinue telehealth
                  services at any time and request an in-person consultation
                  where available.
                </p>

                <p>
                  Telehealth benefits include improved access to care, reduced
                  travel time, and faster follow-ups. However, it may not be
                  suitable for all medical conditions.
                </p>

                <p>
                  Risks include technical failures, limited physical
                  examination, and possible miscommunication.
                </p>

                <p>
                  Reasonable security measures are used to protect your medical
                  data, but no system is completely secure. You are responsible
                  for maintaining privacy on your device.
                </p>

                <p>
                  Telehealth is not for emergencies. In case of an emergency,
                  contact local emergency services immediately.
                </p>

                <p>
                  By agreeing, you confirm you understand and consent to receive
                  healthcare services via telehealth.
                </p>
              </div>

              <label className="flex items-center gap-3 mt-4">
                <input
                  type="checkbox"
                  disabled={!telehealthRead}
                  checked={consent.telehealth}
                  onChange={(e) =>
                    setConsent((p) => ({
                      ...p,
                      telehealth: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  I Accept the Telehealth Consent
                </span>
              </label>
            </div>

            {/* TERMS */}
            <div className="mb-10 border rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-blue-700 flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5" />
                Terms & Conditions
              </h3>

              <div
                ref={termsRef}
                onScroll={() => handleScrollCheck(termsRef, setTermsRead)}
                className="h-56 overflow-y-auto bg-blue-50 rounded-md p-4 text-sm text-gray-700 space-y-4"
              >
                <p>
                  Appointments are subject to provider availability and must be
                  cancelled at least 24 hours in advance.
                </p>

                <p>
                  No-shows or late cancellations may result in forfeiture of
                  fees.
                </p>

                <p>
                  Payment is due before consultation. Refunds are subject to
                  platform policies.
                </p>

                <p>
                  Practitioners provide care based on information shared during
                  consultations.
                </p>

                <p>
                  The platform facilitates scheduling and communication but does
                  not guarantee outcomes.
                </p>

                <p>
                  Liability is limited to the amount paid for the consultation,
                  to the maximum extent permitted by law.
                </p>

                <p>
                  By agreeing, you confirm that you understand and accept all
                  stated terms.
                </p>
              </div>

              <label className="flex items-center gap-3 mt-4">
                <input
                  type="checkbox"
                  disabled={!termsRead}
                  checked={consent.terms}
                  onChange={(e) =>
                    setConsent((p) => ({
                      ...p,
                      terms: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  I Agree to the Terms and Conditions
                </span>
              </label>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleContinue}
                disabled={!allChecked}
                className={`px-8 py-3 rounded-lg font-semibold ${
                  allChecked
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-blue-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Let’s Finalise the Appointment
              </button>

              <button
                onClick={() => setShowDeclineModal(true)}
                className="px-8 py-3 rounded-lg font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                I Do Not Agree
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);

ConsentFormStep.displayName = "ConsentFormStep";
export default ConsentFormStep;
