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
  AlertCircle,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { uploadAttachmentAfterBooking } from '@/lib/s3/uploadAttachmentAfterBooking';
import { createPortal } from 'react-dom';
import { syncAppointmentDraft } from '@/lib/syncAppointmentDraft';
import { useBookingDraftStore } from '@/stores/useBookingDraftStore';

const TEST_MODE = true;

interface StepRefHandle {
  validateStep?: () => boolean;
}

interface Props {
  prevStep: () => void;
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

const PaymentStep = forwardRef<StepRefHandle, Props>(
  (
    {
      prevStep,
      updateData,
      bookingData,
      goToStep,
      bookingControllerRef,
      isManualCheckout = false,
      preExistingId = null
    },
    stepRef
  ) => {
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [mounted, setMounted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    const appointmentIdRef = useRef<string | null>(null);
    const router = useRouter();

    // 💰 PRICING LOGIC
    const baseFee = bookingData.appointmentType?.fee ?? 1450;
    const attendeeSurcharge = (bookingData.selectedAttendees?.length || 0) * 100;
    const consultationFee = baseFee + attendeeSurcharge;

    const serviceFee = Math.round(consultationFee * 0.05);
    const tax = Math.round((consultationFee + serviceFee) * 0.08);
    const totalAmount = consultationFee + serviceFee + tax;

    useEffect(() => {
      setMounted(true);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    useImperativeHandle(stepRef, () => ({
      validateStep: () => {
        if (!paymentDone) {
          toast.error('Please complete the payment to finalize.');
          return false;
        }
        return true;
      }
    }));

    const handlePostBookingActions = async (appointmentId: string) => {
      syncAppointmentDraft.cancel();
      await useBookingDraftStore.getState().reset();

      const file = bookingControllerRef.current?.getAttachment?.();
      if (file instanceof File) {
        await uploadAttachmentAfterBooking(file, appointmentId);
      }

      updateData({
        payment_status: 'completed',
        appointment_id: appointmentId
      });

      router.push('/dashboard/appointment');
    };

    const handlePayment = async () => {
      if (isPaymentProcessing || isVerifying || isExpired) return;

      try {
        setIsPaymentProcessing(true);
        await syncAppointmentDraft.flush();

        // 1. Create Appointment
        const res = await fetch(
          `/api/booking/${bookingData.selectedDoctor?.id}/book-appointment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              starts_at: bookingData.starts_at,
              ends_at: bookingData.ends_at,
              appointment_type: bookingData.appointmentType,
              attendeeList: bookingData.selectedAttendees
            })
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setIsPaymentProcessing(false);
          toast.error(data.error || 'Slot no longer available');
          if (res.status === 409 || res.status === 404) goToStep(2);
          return;
        }

        const appointmentId = data?.appointment?.id;
        appointmentIdRef.current = appointmentId;

        if (TEST_MODE) {
          setTimeout(async () => {
            await handlePostBookingActions(appointmentId);
            setPaymentDone(true);
            setIsPaymentProcessing(false);
            toast.success('Appointment successfully booked! (Test Mode)');
          }, 800);
          return;
        }

        if (!window.payhere) {
          toast.error('Payment system not loaded');
          setIsPaymentProcessing(false);
          return;
        }

        // 2. Initialize PayHere
        const payRes = await fetch('/api/payhere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointment_id: appointmentId,
            practitioner_id: bookingData.selectedDoctor?.id,
            platform_fee: serviceFee,
            consultation_fee: consultationFee
          })
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          toast.error('Payment initialization failed.');
          return;
        }

        const { payment } = await payRes.json();

        window.payhere.onCompleted = async () => {
          setIsVerifying(true);
          let attempts = 0;
          const interval = setInterval(async () => {
            attempts++;
            const r = await fetch(`/api/booking/check-status?appointmentId=${appointmentId}`);
            const d = await r.json();

            if (d.status === 'confirmed') {
              clearInterval(interval);
              await handlePostBookingActions(appointmentId);
              setIsVerifying(false);
              setPaymentDone(true);
              toast.success('Appointment successfully booked!');
            } else if (attempts >= 10) {
              clearInterval(interval);
              setIsVerifying(false);
              toast.error('Verification timeout.');
              router.push('/dashboard/appointment');
            }
          }, 3000);
        };

        window.payhere.startPayment(payment);
      } catch (err) {
        setIsPaymentProcessing(false);
        toast.error('Unexpected error while booking');
      }
    };

    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div className="min-h-screen py-12 px-4 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
              <Lock size={12} /> Secure Checkout
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Review & Pay</h1>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              {/* Doctor Details */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                    <User size={32} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900">{bookingData.selectedDoctor?.name || bookingData.selectedDoctor?.full_name}</h3>
                    <p className="text-blue-600 font-medium text-sm">{bookingData.selectedDoctor?.qualification}</p>
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Calendar size={24} /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Date</p>
                    <p className="font-bold text-slate-800">{bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleDateString() : '—'}</p>
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><Clock size={24} /></div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Type</p>
                    <p className="font-bold text-slate-800">{bookingData.appointmentType?.name}</p>
                  </div>
                </div>
              </div>

              {/* Attendees */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-slate-800 font-bold">
                  <Users size={20} className="text-blue-600" />
                  <h3>Attendees</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium">Primary Patient</div>
                  {bookingData.selectedAttendees.map((name) => (
                    <div key={name} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-700">
                      + {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 sticky top-24">
                <h3 className="text-xl font-black text-slate-900 mb-6">Summary</h3>

                <div className="space-y-4">
                  <div className="flex justify-between text-slate-500 text-sm">
                    <span>Base Consultation Fee</span>
                    <span className="font-bold text-slate-900">LKR {baseFee.toLocaleString()}</span>
                  </div>

                  {attendeeSurcharge > 0 && (
                    <div className="flex justify-between text-slate-500 text-sm">
                      <span>Additional Attendees ({bookingData.selectedAttendees.length})</span>
                      <span className="font-bold text-slate-900">LKR {attendeeSurcharge.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-500 text-sm">
                    <span>Platform Service Fee</span>
                    <span className="font-bold text-slate-900">LKR {serviceFee.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-500 text-sm pb-4 border-b">
                    <span>VAT (8%)</span>
                    <span className="font-bold text-slate-900">LKR {tax.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-900 font-bold">Total Payable</span>
                    <span className="text-3xl font-black text-blue-600">LKR {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button
                    onClick={handlePayment}
                    disabled={isPaymentProcessing || isExpired}
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:bg-slate-300"
                  >
                    {isPaymentProcessing ? <Loader2 className="animate-spin" /> : "Confirm & Pay"}
                  </button>
                  <button onClick={prevStep} className="w-full py-3 text-slate-500 text-sm font-bold">Back</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {mounted && createPortal(
          <div className="relative z-[10001]">
            {(isPaymentProcessing || isExpired) && (
              <div className={`fixed top-0 inset-x-0 py-3 text-white font-bold text-center ${isExpired ? "bg-red-600" : "bg-slate-900"}`}>
                {isExpired ? "SESSION EXPIRED" : `CHECKOUT WINDOW: ${formatTime(timeLeft)}`}
              </div>
            )}
            {isVerifying && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center">
                <div className="bg-white p-10 rounded-3xl text-center">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold">Verifying Payment...</h3>
                </div>
              </div>
            )}
          </div>, document.body
        )}
      </div>
    );
  }
);

PaymentStep.displayName = 'PaymentStep';
export default PaymentStep;