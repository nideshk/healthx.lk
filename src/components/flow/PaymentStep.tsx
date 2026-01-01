'use client';

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect
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
import { createPortal } from 'react-dom';

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
  isManualCheckout?: boolean;
  preExistingId?: string | null;
}

declare global {
  interface Window {
    payhere: any;
  }
}

const releaseAppointmentSlot = async (appointmentId: string | null) => {
  if (!appointmentId) {
    console.warn("No appointment ID provided to release slot.");
    return;
  }

  try {
    const res = await fetch('/api/booking/release-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId })
    });

    if (!res.ok) {
      console.error("Failed to release slot. Status:", res.status);
    } else {
      console.log("Slot released successfully:", appointmentId);
    }
  } catch (err) {
    console.error("Error calling release-slot API:", err);
  }
};

const PaymentStep = forwardRef<StepRefHandle, Props>(
  ({ prevStep, updateData, bookingData, goToStep, bookingControllerRef, isManualCheckout = false, preExistingId = null }, stepRef) => {
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 mins
    const [mounted, setMounted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const appointmentIdRef = React.useRef<string | null>(null);

    useEffect(() => { setMounted(true) }, []);

    const handleExpiry = async () => {
      // If session is expired, release the slot and redirect them to dashboard
      setIsExpired(true);
      setIsPaymentProcessing(false);
      setIsVerifying(true);

      const id = appointmentIdRef.current;
      releaseAppointmentSlot(id);
      setTimeout(() => {
        window.location.href = '/dashboard/appointment';
      }, 2300);
    };

    // useEffect specifically for the Countdown
    useEffect(() => {
      let timer: NodeJS.Timeout;

      // We start the timer as soon as the booking process starts
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

      // Cleanup: Important to stop the timer if the user finishes early or leaves
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [isPaymentProcessing, isVerifying]);

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

    // Disable page while payment is processing
    useEffect(() => {
      if (isVerifying || isPaymentProcessing) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      // Cleanup function to ensure scroll is restored if the component unmounts
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isVerifying, isPaymentProcessing]);

    /* ---------------------------
     * HANDLE PAYMENT
     * -------------------------- */
    const handlePayment = async () => {
      
      if (isPaymentProcessing || isVerifying) {
        return;
      }

      // Check to ensure that payhere SDK is ready
      if (typeof window === "undefined" || !window.payhere) {
        toast.error("Payment system is still loading. Please wait a few seconds and try again.");
        return;
      }
      const mainLayout = document.getElementById('main-app-layout');
      let paymentPayload:any = null;
      let currentAppointmentId = preExistingId;

      try {
        setIsPaymentProcessing(true);
        const practitionerId = doctor?.id;
        const appointment_type_id = type?.id;
        let first_name="", last_name="", email="", phone = "", address = "", city ="", country="", finalPrice;

        // Adding this condition to differentiate between fresh booking and an existing booking
        if (!isManualCheckout || !currentAppointmentId) {
          console.log("Normal Flow starting!!!!!!!!!!!!!!!!!!!!!!!!");
          
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
          currentAppointmentId = data?.appointment?.id;
          paymentPayload = data?.paymentPayload;
          first_name = paymentPayload?.first_name;
          last_name = paymentPayload?.last_name;
          phone = paymentPayload?.phone;
          email = paymentPayload?.email;
          address = paymentPayload?.address;
          city = paymentPayload?.city;
          country = paymentPayload?.country;
          finalPrice = data?.appointment?.fee_charged
          //console.log("Data  book-appointmtnet API : ", data);
          if (!data?.appointment?.id || !data?.paymentPayload) {
            setIsPaymentProcessing(false);
            toast.error("Could not initialize payment data. Please try again.");
            return;
          }
        }

        appointmentIdRef.current = currentAppointmentId;

        console.log("Calling payhere from paymentStpe file");
                
        // Get the values from bookingData if its manualCheckout and it would have skipped above logic
        if(bookingData)
        {
          const fullName = bookingData?.fullName;   
          if(fullName)
            [first_name, last_name] = fullName?.split(" "); 
          if(!email)
            email = bookingData?.email || "";
          if(!phone)
            phone = bookingData?.phone || "";

          const completeAddress = bookingData?.address; // Check logic once with anirudh because we don't have seperate fields for address, city, country in patients thats why I have split it up - can cause issues or inconsistency if everyone doesn't enter in same format
          if(completeAddress){
              const addressParts = completeAddress.split(",").map(x => x.trim());
              address = addressParts[0];
              city = addressParts[1];
              country = addressParts[2];
          }else
          {
            // Fallback in case address is not provided, give some defaults as its required by payhere
            address = "Default address";
            city = "Default city";
            country = "Sri lanka";
          }

          if(!finalPrice){
            finalPrice = bookingData?.fee_charged;
          }
        }
        const payRes = await fetch('/api/payhere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: first_name, // Ensure your API returns user details
            last_name: last_name,
            email: email,
            phone: phone,
            address: address,
            city: city,
            country: country,
            appointment_id: currentAppointmentId,
            practitioner_id: doctor?.id,
            platform_fee: serviceFee, // Change with platformFee verify
            consultation_fee: consultationFee
          }),
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          const errorData = await payRes.json();

          if (currentAppointmentId) {
            releaseAppointmentSlot(currentAppointmentId)
            updateData({ appointment_id: undefined })
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
              setIsPaymentProcessing(false);
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              setIsVerifying(true);

              let attempts = 0;
              const maxAttempts = 5;
              const pollInterval = 2000;

              const verifyPayment = async () => {
                try {
                  const res = await fetch(`/api/booking/check-status?appointmentId=${currentAppointmentId}`);
                  if (!res.ok) return false;
                  const data = await res.json();
                  if (data.status === 'confirmed' && data.payment_status === 'paid') {
                    return true;
                  }
                  return false;
                } catch (err) {
                  console.error("Polling error:", err);
                  return false;
                }
              };

              // Verify with backend to confirm the payment was done
              const checkInterval = setInterval(async () => {
                attempts++;

                const isVerified = await verifyPayment();

                if (isVerified) {
                  // Checked and confirmed that payment is done
                  clearInterval(checkInterval);
                  await handlePostBookingActions(currentAppointmentId!);
                  setIsVerifying(false);
                  setPaymentDone(true);
                  toast.success("Payment verified! Your appointment is successfully booked.");
                }
                else if (attempts >= maxAttempts) {
                  // attempts finished and payment couldn't be verified
                  clearInterval(checkInterval);
                  releaseAppointmentSlot(currentAppointmentId);
                  setIsVerifying(false);
                  toast.error("Booking cancelled, Payment could not be verified.");
                  // Redirect to dashboard
                  router.push('/dashboard/appointment');
                }
              }, pollInterval);
            };

            window.payhere.onDismissed = function onDismissed() {
              setIsVerifying(true);
              setIsPaymentProcessing(false);
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              releaseAppointmentSlot(currentAppointmentId);

              setTimeout(() => {
                setIsVerifying(false);
                toast.error("Booking cancelled. Redirecting to dashboard.");
                router.push(`/dashboard/appointment`);
              }, 2300);
            };

            window.payhere.onError = function onError(error: string) {
              mainLayout?.classList.remove('blur-md', 'brightness-75', 'pointer-events-none');
              setIsPaymentProcessing(false);
              setIsVerifying(false);
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

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      // padStart ensures that 9 seconds shows as "09" instead of "9"
      return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        {/* 2. PORTAL (Teleports the UI to the Body to escape the Blur) */}
        {mounted && createPortal(
          <div className="relative z-[10001]">
            {/* Full Width Top Bar Timer */}
            {(isPaymentProcessing || isExpired) && (!isVerifying || isExpired) && !paymentDone && (
              <div className={`fixed top-0 left-0 right-0 z-[10001] transition-all duration-500 shadow-md ${isExpired || timeLeft < 60 ? "bg-red-600" : "bg-blue-600"
                }`}>
                <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between text-white">

                  {/* Left Side: Message */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-1.5 rounded-md bg-white/20 ${isExpired ? "animate-bounce" : ""}`}>
                      {isExpired ? <span className="text-sm sm:text-base">⚠️</span> : <Loader2 size={18} className="animate-spin" />}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-90 leading-none">
                        {isExpired ? "Booking Status" : "Secure Booking"}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-tight">
                        {isExpired
                          ? "Your session has expired. Please wait for redirection..."
                          : "Complete your payment before the timer runs out to secure this slot."}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Timer/Status */}
                  <div className="pl-4 border-l border-white/20 flex flex-col items-end shrink-0">
                    <span className="text-[9px] uppercase font-bold opacity-70 leading-none mb-0.5">
                      Time Left
                    </span>
                    <span className="font-mono text-lg sm:text-2xl font-black leading-none tracking-tighter">
                      {isExpired ? "00:00" : formatTime(timeLeft)}
                    </span>
                  </div>

                </div>
              </div>
            )}
            {/* Verififcation overlay */}
            {isVerifying && (
              <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-black/40">
                <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-gray-100">
                  <div className="relative mb-6">
                    {isExpired ? (
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center animate-bounce">
                        <span className="text-2xl font-bold">!</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {isExpired ? "Session Timed Out" : "Verifying Payment"}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed px-4">
                    {isExpired
                      ? "The 10-minute booking window has closed. Please try again."
                      : "Please wait while we confirm your booking with the bank."}
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
