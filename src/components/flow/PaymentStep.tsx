'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef
} from 'react';
import { AppointmentFormInputs } from '@/types/FormType';
import {
  Calendar,
  User,
  ClipboardList,
  Loader2,
  ShieldCheck,
  Clock,
  Info,
  Lock,
  ChevronLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { uploadAttachmentAfterBooking } from '@/lib/s3/uploadAttachmentAfterBooking';
import { createPortal } from 'react-dom';

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
    await fetch('/api/booking/release-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId })
    });
  } catch (err) {
    console.error("Error releasing slot:", err);
  }
};

const PaymentStep = forwardRef<StepRefHandle, Props>(
  ({ prevStep, updateData, bookingData, goToStep, bookingControllerRef, isManualCheckout = false, preExistingId = null }, stepRef) => {
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [mounted, setMounted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const appointmentIdRef = useRef<string | null>(null);
    const router = useRouter();

    useEffect(() => { setMounted(true) }, []);

    const handleExpiry = async () => {
      setIsExpired(true);
      setIsPaymentProcessing(false);
      setIsVerifying(true);
      releaseAppointmentSlot(appointmentIdRef.current);
      setTimeout(() => { window.location.href = '/dashboard/appointment'; }, 2300);
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

    // Pricing Logic
    const consultationFee = bookingData.appointmentType?.fee ?? 1450;
    const serviceFee = Math.round(consultationFee * 0.05);
    const tax = Math.round((consultationFee + serviceFee) * 0.08);
    const totalAmount = consultationFee + serviceFee + tax;

    useImperativeHandle(stepRef, () => ({
      validateStep: () => {
        if (!paymentDone) {
          toast.error('Please complete the payment to finalize.');
          return false;
        }
        return true;
      },
    }));

    const handlePayment = async () => {
      if (isPaymentProcessing || isVerifying) return;
      if (typeof window === "undefined" || !window.payhere) {
        toast.error("Payment system is loading...");
        return;
      }

      const mainLayout = document.getElementById('main-app-layout');
      let currentAppointmentId = preExistingId;

      try {
        setIsPaymentProcessing(true);
        let first_name = "", last_name = "", email = "", phone = "", address = "", city = "", country = "", finalPrice;

        if (!isManualCheckout || !currentAppointmentId) {
          const date = bookingData.starts_at?.split('T')[0];
          const time = new Date(bookingData.starts_at || '').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

          const res = await fetch(`/api/booking/${bookingData.selectedDoctor?.id}/book-appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, appointment_type_id: bookingData.appointmentType?.id, attendeeList: bookingData.selectedAttendees }),
          });
          const data = await res.json();
          if (!res.ok) {
            setIsPaymentProcessing(false);
            toast.error(data.error || 'Slot no longer available');
            if (res.status === 409 || res.status === 404) goToStep(2);
            return;
          }
          currentAppointmentId = data?.appointment?.id;
          first_name = data?.paymentPayload?.first_name;
          last_name = data?.paymentPayload?.last_name;
          phone = data?.paymentPayload?.phone;
          email = data?.paymentPayload?.email;
          address = data?.paymentPayload?.address;
          city = data?.paymentPayload?.city;
          country = data?.paymentPayload?.country;
        }

        appointmentIdRef.current = currentAppointmentId;

        // Manual Checkout mapping if applicable
        if (bookingData && isManualCheckout) {
          const [f, l] = (bookingData.fullName || "").split(" ");
          first_name = f; last_name = l;
          email = email || bookingData.email || "";
          phone = phone || bookingData.phone || "";
        }

        const payRes = await fetch('/api/payhere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name, last_name, email, phone, address: address || "N/A", city: city || "N/A", country: country || "Sri Lanka",
            appointment_id: currentAppointmentId, practitioner_id: bookingData.selectedDoctor?.id,
            platform_fee: serviceFee, consultation_fee: consultationFee
          }),
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          if (currentAppointmentId) releaseAppointmentSlot(currentAppointmentId);
          toast.error("Payment initialization failed.");
          return;
        }

        const { payment } = await payRes.json();
        mainLayout?.classList.add('blur-sm', 'brightness-90', 'pointer-events-none');

        window.payhere.onCompleted = async function () {
          setIsPaymentProcessing(false);
          mainLayout?.classList.remove('blur-sm', 'brightness-90', 'pointer-events-none');
          setIsVerifying(true);

          let attempts = 0;
          const checkInterval = setInterval(async () => {
            attempts++;
            const res = await fetch(`/api/booking/check-status?appointmentId=${currentAppointmentId}`);
            const data = await res.json();
            if (data.status === 'confirmed') {
              clearInterval(checkInterval);
              await handlePostBookingActions(currentAppointmentId!);
              setIsVerifying(false);
              setPaymentDone(true);
              toast.success("Appointment successfully booked!");
            } else if (attempts >= 5) {
              clearInterval(checkInterval);
              releaseAppointmentSlot(currentAppointmentId);
              setIsVerifying(false);
              toast.error("Verification failed.");
              router.push('/dashboard/appointment');
            }
          }, 3000);
        };

        window.payhere.onDismissed = function () {
          mainLayout?.classList.remove('blur-sm', 'brightness-90', 'pointer-events-none');
          setIsPaymentProcessing(false);
          releaseAppointmentSlot(currentAppointmentId);
          toast.warn("Payment Cancelled.");
        };

        window.payhere.startPayment(payment);
      } catch (err) {
        setIsPaymentProcessing(false);
        toast.error('Unexpected error while booking');
      }
    };

    const handlePostBookingActions = async (appointmentId: string) => {
      const file = bookingControllerRef.current?.getAttachment?.();
      if (file instanceof File) await uploadAttachmentAfterBooking(file, appointmentId);
      updateData({ payment_status: 'completed', appointment_id: appointmentId });
      router.push('/dashboard/appointment');
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="min-h-screen py-12 px-4 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
              <Lock size={12} /> Secure Checkout
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Review & Pay
            </h1>
            <p className="text-slate-500 mt-2">Please double-check your session details before proceeding.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Details */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Doctor Card */}
              <div className="group relative overflow-hidden bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <User size={32} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{bookingData.selectedDoctor?.name}</h3>
                        <p className="text-blue-600 font-medium text-sm">{bookingData.selectedDoctor?.qualification}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-widest">
                        Practitioner
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Detail Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Date & Time</p>
                    <p className="font-bold text-slate-800">
                      {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Type & Duration</p>
                    <p className="font-bold text-slate-800">{bookingData.appointmentType?.name}</p>
                    <p className="text-sm text-slate-500">{bookingData.appointmentType?.duration_mins} Minutes</p>
                  </div>
                </div>
              </div>

              {/* Attendees */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                  <ClipboardList size={20} className="text-blue-600" />
                  <h3>Booking For</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                   <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700">
                    Primary Patient (You)
                   </div>
                   {bookingData.selectedAttendees.map((attendee) => (
                    <div key={attendee} className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm font-medium text-blue-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {attendee}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-slate-100 sticky top-24">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900">Summary</h3>
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-slate-500 text-sm">
                    <span>Consultation Fee</span>
                    <span className="font-bold text-slate-900">LKR {(consultationFee+950).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-sm">
                    <span>Platform Service Fee</span>
                    <span className="font-bold text-slate-900">LKR {serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-sm pb-4 border-b border-slate-50">
                    <span>Estimated Tax (VAT)</span>
                    <span className="font-bold text-slate-900">LKR {tax.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-900 font-bold">Total Payable</span>
                    <span className="text-3xl font-black text-blue-600 tracking-tight">
                      LKR {(totalAmount+950).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    onClick={handlePayment}
                    disabled={isPaymentProcessing}
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:bg-slate-300"
                  >
                    {isPaymentProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>Confirm & Pay <ChevronLeft size={18} className="rotate-180" /></>
                    )}
                  </button>
                  <button
                    onClick={() => prevStep()}
                    disabled={isPaymentProcessing}
                    className="w-full py-3 bg-white text-slate-500 text-sm font-bold rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all"
                  >
                    Modify Session Details
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    By clicking pay, you agree to our <strong>Terms of Service</strong>. You will be redirected to PayHere to complete the transaction securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Portals */}
        {mounted && createPortal(
          <div className="relative z-[10001]">
            {/* Countdown Banner */}
            {(isPaymentProcessing || isExpired) && !paymentDone && (
              <div className={`fixed top-0 inset-x-0 z-[10001] py-3 text-white font-bold transition-all duration-500 ${isExpired || timeLeft < 60 ? "bg-red-600" : "bg-slate-900"}`}>
                <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-xs md:text-sm">
                    <Clock size={16} className={isExpired ? "animate-pulse" : ""} />
                    <span>{isExpired ? "SESSION EXPIRED" : "SECURE CHECKOUT WINDOW"}</span>
                   </div>
                   <span className="font-mono text-xl">{isExpired ? "00:00" : formatTime(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* Status Overlays */}
            {(isVerifying || isExpired) && (
              <div className="fixed inset-0 z-[20000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
                <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20">
                  <div className="flex justify-center mb-6">
                    {isExpired ? (
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                        <AlertCircle size={40} />
                      </div>
                    ) : (
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">
                    {isExpired ? "Time's Up" : "Verifying..."}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-2">
                    {isExpired ? "Your 10-minute booking window has expired. Returning to dashboard." : "Finalizing your appointment with the provider."}
                  </p>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
      </div>
    );
  }
);

PaymentStep.displayName = 'PaymentStep';
export default PaymentStep;