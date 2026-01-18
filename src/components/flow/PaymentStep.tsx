'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef
} from 'react';
import { AppointmentFormInputs } from '@/types/FormType';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import localforage from "localforage";

import { uploadAttachmentAfterBooking } from '@/lib/s3/uploadAttachmentAfterBooking';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/contexts/AuthContext';
import PaymentStepUI from '../PaymentPageUI';
import { useBookingDraftStore } from '@/stores/useBookingDraftStore';

interface StepRefHandle {
  validateStep?: () => boolean;
}

interface Props {
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  goToStep: (step: number) => void;
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachment?: () => File | null;
  }>;
  isManualCheckout?: boolean;
  preExistingId?: string | null;
}

declare global {
  interface Window {
    payhere: any;
  }
}

const releaseAppointmentSlot = async (appointmentId: string | null) => {
  if (!appointmentId) return;
  try {
    const res = await authFetch('/api/booking/release-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId })
    });
    if (res.ok) console.log("Slot released successfully:", appointmentId);
  } catch (err) {
    console.error("Error calling release-slot API:", err);
  }
};

const PaymentStep = forwardRef<StepRefHandle, Props>(
  ({ prevStep, updateData, bookingData, goToStep, bookingControllerRef, isManualCheckout = false, preExistingId = null }, stepRef) => {

    // --- State ---
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [mounted, setMounted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    const appointmentIdRef = useRef<string | null>(null);
    const router = useRouter();
    const { user } = useAuth();

    // --- Derived Pricing Logic ---
    const consultationFee = (bookingData?.appointmentType?.platform_fee || 950) + (bookingData?.appointmentType?.fee || 1450);
    const attendeeCount = bookingData?.selectedAttendees?.length || 0;

    // --- Lifecycle & Timer ---
    useEffect(() => { setMounted(true); }, []);

    const handleExpiry = async () => {
      setIsExpired(true);
      setIsPaymentProcessing(false);
      setIsVerifying(true);
      releaseAppointmentSlot(appointmentIdRef.current);
      setTimeout(() => {
        window.location.href = '/dashboard/appointment';
      }, 2300);
    };

    useEffect(() => {
      let timer: NodeJS.Timeout;
      if (isPaymentProcessing || isVerifying) {
        timer = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              handleExpiry();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return () => { if (timer) clearInterval(timer); };
    }, [isPaymentProcessing, isVerifying]);

    // Handle Page Scroll Lock
    useEffect(() => {
      document.body.style.overflow = (isVerifying || isPaymentProcessing) ? 'hidden' : 'unset';
      return () => { document.body.style.overflow = 'unset'; };
    }, [isVerifying, isPaymentProcessing]);

    // Expose validation to parent
    useImperativeHandle(stepRef, () => ({
      validateStep: () => {
        if (!paymentDone) {
          toast.error('Please complete the payment to finalize.');
          return false;
        }
        return true;
      },
    }));

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Post-Booking Actions ---
    const handlePostBookingActions = async (appointmentId: string) => {
      let file: File | null = null;

      if (bookingControllerRef?.current?.getAttachment) {
        file = bookingControllerRef.current.getAttachment();
      }

      if (file instanceof File) {
        try {
          await uploadAttachmentAfterBooking(file, appointmentId);
        } catch (err) {
          toast.warn('Attachment upload failed. You can re-upload later.');
        }
      }

      const { reset } = useBookingDraftStore.getState();

      // 1️⃣ Clear draft properly (DB + memory)
      await reset();


      updateData({ payment_status: 'completed', appointment_id: appointmentId });
      router.push('/dashboard/appointment');
    };

    // --- Payment Execution ---
    const handlePayment = async () => {
      if (isPaymentProcessing || isVerifying) return;

      if (typeof window === "undefined" || !window.payhere) {
        toast.error("Payment system loading...");
        return;
      }

      const mainLayout = document.getElementById('main-app-layout');
      let currentAppointmentId = preExistingId;

      try {
        setIsPaymentProcessing(true);
        const practitionerId = bookingData.selectedDoctor?.id;
        const appointment_type_id = bookingData.appointmentType?.id;

        // 1. Logic for Fresh Booking
        if (!isManualCheckout || !currentAppointmentId) {
          const date = bookingData.starts_at?.split('T')[0];
          const time = new Date(bookingData.starts_at || '').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          const res = await authFetch(`/api/booking/${practitionerId}/book-appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, appointment_type_id, attendeeList: bookingData.selectedAttendees }),
          });

          const data = await res.json();
          if (!res.ok) {
            setIsPaymentProcessing(false);
            if (res.status === 409 || res.status === 404) goToStep(2);
            toast.error(data.error || 'Booking session failed');
            return;
          }
          currentAppointmentId = data?.appointment?.id;
        }

        appointmentIdRef.current = currentAppointmentId;

        // 2. Fetch PayHere Hash/Payload from Backend
        const payRes = await authFetch('/api/payhere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: user?.profile?.first_name || bookingData.fullName?.split(" ")[0],
            last_name: user?.profile?.last_name || bookingData.fullName?.split(" ")[1],
            email: user?.user?.email || bookingData.email,
            phone: user?.phone || bookingData.phone,
            address: bookingData.address || "Default",
            city: user?.profile?.city || "Default",
            country: user?.profile?.country || "Sri Lanka",
            appointment_id: currentAppointmentId,
            practitioner_id: practitionerId,
            platform_fee: bookingData.appointmentType?.platform_fee,
            consultation_fee: consultationFee
          }),
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          releaseAppointmentSlot(currentAppointmentId);
          toast.error("Payment initialization failed");
          return;
        }

        const { payment } = await payRes.json();
        mainLayout?.classList.add('blur-md', 'brightness-75', 'pointer-events-none');

        // 3. PayHere SDK Events
        window.payhere.onCompleted = async (orderId: string) => {
          setIsPaymentProcessing(false);
          mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
          setIsVerifying(true);

          // Polling for confirmation
          let attempts = 0;
          const checkInterval = setInterval(async () => {
            attempts++;
            const res = await authFetch(`/api/booking/check-status?appointmentId=${currentAppointmentId}`);
            const data = await res.json();

            if (data.status === 'confirmed') {
              clearInterval(checkInterval);
              await handlePostBookingActions(currentAppointmentId!);
              setPaymentDone(true);
              setIsVerifying(false);
            } else if (attempts >= 5) {
              clearInterval(checkInterval);
              releaseAppointmentSlot(currentAppointmentId);
              router.push('/dashboard/appointment');
            }
          }, 2000);
        };

        window.payhere.onDismissed = () => {
          mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
          setIsPaymentProcessing(false);
          releaseAppointmentSlot(currentAppointmentId);
          toast.error("Cancelled");
        };

        window.payhere.startPayment(payment);

      } catch (err) {
        setIsPaymentProcessing(false);
        mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
        toast.error('Unexpected error');
      }
    };

    return (
      <>
        <PaymentStepUI
          bookingData={bookingData}
          consultationFee={consultationFee}
          attendeeCount={attendeeCount}
          timeLeft={timeLeft}
          formatTime={formatTime}
          isPaymentProcessing={isPaymentProcessing}
          isVerifying={isVerifying}
          isExpired={isExpired}
          paymentDone={paymentDone}
          handlePayment={handlePayment}
          prevStep={prevStep}
        />

        {/* Portals for Overlays */}
        {mounted && createPortal(
          <div className="relative z-[10001]">
            {(isPaymentProcessing || isExpired) && !isVerifying && (
              <div className={`fixed top-0 left-0 right-0 z-[10001] transition-all duration-500 shadow-md ${isExpired || timeLeft < 60 ? "bg-red-600" : "bg-blue-600"}`}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className={isExpired ? "" : "animate-spin"} />
                    <span className="text-sm font-medium">
                      {isExpired ? "Session Expired" : "Complete payment to secure slot"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase opacity-70">Time Left</span>
                    <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
                  </div>
                </div>
              </div>
            )}

            {isVerifying && (
              <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-black/40">
                <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <h3 className="text-xl font-bold">Verifying Payment</h3>
                  <p className="text-gray-600">Confirming your booking with the bank...</p>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </>
    );
  }
);

PaymentStep.displayName = 'PaymentStep';
export default PaymentStep;