'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { AppointmentFormInputs } from '@/types/FormType';
import {
  CheckCircle2,
  Calendar,
  User,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { uploadAttachmentAfterBooking } from '@/lib/s3/uploadAttachmentAfterBooking';

interface StepRefHandle {
  validateStep?: () => boolean;
}
interface Props {
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  goToStep: (step: number) => void;

  // ✅ SINGLE SOURCE OF TRUTH
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachment?: () => File | null;
  }>;
}

declare global {
  interface Window {
    payhere: any;
  }
}

const PaymentStep = forwardRef<StepRefHandle, Props>(
  ({ prevStep, updateData, bookingData, goToStep, bookingControllerRef }, stepRef) => {
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const router = useRouter();

    /* ---------------------------
     * DERIVED DATA (SAFE)
     * -------------------------- */
    const doctor = bookingData.selectedDoctor;
    const type = bookingData.appointmentType;
    const service = bookingData.selectedService;
    const consent = bookingData.consent || {};
    const attendeeList = bookingData.selectedAttendees || [];
    const attendeeCount = attendeeList.length || 1;

    /* ---------------------------
     * PRICING (FROM APPOINTMENT TYPE)
     * -------------------------- */
    const consultationFee = type?.fee ?? 1450;
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

    /* ---------------------------
     * HANDLE PAYMENT
     * -------------------------- */
    const handlePayment = async () => {

      // Check to ensure that payhere SDK is ready
      if (typeof window === "undefined" || !window.payhere) {
        toast.error("Payment system is still loading. Please wait a few seconds and try again.");
        return;
      }
      const mainLayout = document.getElementById('main-app-layout');

      try {
        setIsPaymentProcessing(true);
        const practitionerId = doctor?.id;
        const appointment_type_id = type?.id;

        const date = bookingData.starts_at?.split('T')[0];
        const time = new Date(bookingData.starts_at || '')
          .toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });

        if (!practitionerId || !appointment_type_id || !date || !time) {
          setIsPaymentProcessing(false);
          toast.error('Missing booking details. Please review.');
          return;
        }

        // 1️⃣ Create appointment (uncomment and use real API in production)
        const res = await fetch(
          `/api/booking/${practitionerId}/book-appointment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              time,
              appointment_type_id,
              attendeeList
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setIsPaymentProcessing(false);
          if (res.status === 409) {
            toast.error(data.error || 'Slot no longer available');
            goToStep(2);
          }
          else if (res.status === 404) {
            toast.error("Booking session expired. Please start over.");
            goToStep(2);
          } else {
            toast.error(data.error || 'Failed to initialize booking. Please try again.');
          }
          return;
        }

        console.log("Data from book-appointmtnet API : ", data);
        if (!data?.appointment?.id || !data?.paymentPayload) {
          setIsPaymentProcessing(false);
          toast.error("Could not initialize payment data. Please try again.");
          return;
        }
        const appointmentId = data.appointment.id; // Replace with real ID from API

        console.log("Calling payhere from paymentStpe file");

        const payRes = await fetch('/api/payhere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: data.paymentPayload?.first_name || "Patient", // Ensure your API returns user details
            last_name: data.paymentPayload?.last_name,
            email: data.paymentPayload?.email,
            phone: data.paymentPayload?.phone,
            address: "Online Booking",
            city: "Colombo",
            country: "Sri Lanka",
            booking_amount: data.paymentPayload.amount, // The total calculated in your component
            appointment_id: data.paymentPayload.appointment_id,
            practitioner_id: data.paymentPayload.practitioner_id,
            platform_fee: data.paymentPayload.platform_fee,
            consultation_fee: data.paymentPayload.consultation_fee
          }),
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          const errorData = await payRes.json();

          if (data.appointment?.id) {
            await fetch('/api/booking/release-slot', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appointmentId: data.appointment.id })
            });

            updateData({appointment_id: undefined})
          }

          toast.error(`Payment failed : ${errorData.error}`);
          return;
        }

        console.log("payhere call done from payment file");

        const { payment } = await payRes.json();
        console.log("Payment payload : ", payment);

        try {
          if (window.payhere) {

            mainLayout?.classList.add('blur-md', 'brightness-75', 'pointer-events-none');

            window.payhere.onCompleted = async function onCompleted(orderId: string) {
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              toast.success("Payment successful!");
              setIsPaymentProcessing(false);
              toast.success('Appointment booked successfully!');
              setPaymentDone(true);
              // Handle post-booking logic (files/redirect)
              await handlePostBookingActions(appointmentId);
            };

            window.payhere.onDismissed = function onDismissed() {
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              setIsPaymentProcessing(false);

              // Release the slot immediately
              fetch('/api/booking/release-slot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: data.paymentPayload.appointment_id })
              });

              toast.error("Booking cancelled. You can try booking again or choose a different time.");
              setTimeout(() => {
                router.push(`/failure`);
              }, 1500);
            };

            window.payhere.onError = function onError(error: string) {
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              setIsPaymentProcessing(false);
              toast.error("Payment Error: " + error);
              setTimeout(() => {
                router.push(`/failure`);
              }, 1500);
            };

            window.payhere.startPayment(payment);
          }
        }
        catch (err) {
          mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
          console.error(err);
          toast.error('Unexpected error while booking');
        }

      } catch (err) {
        console.error(err);
        setIsPaymentProcessing(false);
        toast.error('Unexpected error while booking');
      }
    };

    // Helper to keep the main function clean
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

      updateData({ payment_status: 'completed', appointment_id: appointmentId });
      router.push('/dashboard/appointment');
    };

    /* ---------------------------
     * RENDER
     * -------------------------- */
    return (
      <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">

          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
            Review & Complete Payment
          </h1>

          <div className="grid lg:grid-cols-3 gap-10">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">

              <div className="p-6 rounded-2xl bg-white shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Doctor Details
                </h3>
                <p className="text-lg font-semibold">{doctor?.full_name}</p>
                <p className="text-sm text-gray-600">{doctor?.profile_bio}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Appointment Details
                </h3>
                <p><strong>Type:</strong> {type?.name}</p>
                <p><strong>Duration:</strong> {type?.duration_mins} mins</p>
                <p><strong>Date:</strong> {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleDateString() : '—'}</p>
                <p><strong>Time:</strong> {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white shadow">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  Service
                </h3>
                <p>{service?.name}</p>
              </div>

              <div className="p-6 rounded-2xl bg-white shadow">
                <h3 className="text-xl font-semibold mb-4">Consents</h3>
                <p className="flex items-center gap-2">
                  Telehealth:
                  {consent.telehealth ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </p>
                <p className="flex items-center gap-2 mt-2">
                  Terms:
                  {consent.terms ? (
                    <CheckCircle2 className="text-green-600" />
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </p>
              </div>

            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-white shadow sticky top-24">
                <h3 className="text-xl font-bold mb-5">Pricing Summary</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Consultation</span>
                    <span>LKR {consultationFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span>LKR {serviceFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>LKR {tax}</span>
                  </div>

                  <hr />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-700">LKR {totalAmount}</span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={isPaymentProcessing}
                  className="w-full mt-6 py-3 rounded-lg text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-green-600 flex items-center justify-center gap-2"
                  aria-busy={isPaymentProcessing}
                >
                  {
                    isPaymentProcessing
                      ? (<Loader2 size={20} className="animate-spin" />)
                      : 'Pay Now →'
                  }
                </button>
                <button
                  onClick={() => prevStep()}
                  disabled={isPaymentProcessing}
                  className="mt-4 w-full text-sm text-gray-600 underline"
                >
                  ← Back
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
);

PaymentStep.displayName = 'PaymentStep';
export default PaymentStep;
