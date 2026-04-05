"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from "react";
import { AppointmentFormInputs } from "@/types/FormType";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { uploadAttachmentAfterBooking } from "@/lib/s3/uploadAttachmentAfterBooking";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/contexts/AuthContext";
import PaymentStepUI from "../PaymentPageUI";
import { useBookingDraftStore } from "@/stores/useBookingDraftStore";

interface StepRefHandle {
  validateStep?: () => boolean;
}

interface Props {
  prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  goToStep: (step: number) => void;
  nextStep: () => void;
  bookingControllerRef: React.MutableRefObject<{
    validateStep?: () => boolean;
    getAttachments?: () => File[];
  }>;
  isManualCheckout?: boolean;
  preExistingId?: string | null;
}

declare global {
  interface Window {
    payhere: any;
  }
}

type releaseReason = "PAYMENT_FAILED" | "PAYMENT_DISMISSED" | "SESSION_EXPIRED" | "MISSING_DATA";
const releaseAppointmentSlot = async (appointmentId: string | null, reason: releaseReason) => {
  if (!appointmentId) return;
  try {
    const res = await authFetch("/api/booking/release-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, reason }),
    });
  } catch (err) {
    console.error("Error calling release-slot API:", err);
  }
};

const PaymentStep = forwardRef<StepRefHandle, Props>(
  (
    {
      prevStep,
      updateData,
      bookingData,
      nextStep,
      goToStep,
      bookingControllerRef,
      isManualCheckout = false,
      preExistingId = null,
    },
    stepRef,
  ) => {
    const t = useTranslations("paymentStep");
    const [paymentDone, setPaymentDone] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [mounted, setMounted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    const appointmentIdRef = useRef<string | null>(null);
    const router = useRouter();
    const { user } = useAuth();

    const consultationFee = (bookingData?.consultation_fee ?? 0) > 0
      ? (bookingData.consultation_fee + (bookingData.platform_fee ?? 0))
      : (bookingData?.appointmentType?.platform_fee ?? 950) + (bookingData?.appointmentType?.fee ?? 1450);
    const attendeeCount = bookingData?.selectedAttendees?.length || 0;

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleExpiry = async () => {
      setIsExpired(true);
      setIsPaymentProcessing(false);
      setIsVerifying(true);
      releaseAppointmentSlot(appointmentIdRef.current, "SESSION_EXPIRED");
      setTimeout(() => {
        window.location.href = "/dashboard/appointment";
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
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [isPaymentProcessing, isVerifying]);

    useEffect(() => {
      document.body.style.overflow =
        isVerifying || isPaymentProcessing ? "hidden" : "unset";
      return () => {
        document.body.style.overflow = "unset";
      };
    }, [isVerifying, isPaymentProcessing]);

    useImperativeHandle(stepRef, () => ({
      validateStep: () => {
        if (!paymentDone) {
          toast.error(t("errors.completePayment"));
          return false;
        }
        return true;
      },
    }));

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handlePostBookingActions = async (appointmentId: string) => {
      let files: File[] = [];

      if (bookingControllerRef?.current?.getAttachments) {
        files = bookingControllerRef.current.getAttachments();
      }

      if (files.length > 0) {
        for (const file of files) {
          try {
            await uploadAttachmentAfterBooking(file, appointmentId);
          } catch {
            toast.warn(t("warnings.attachmentUploadFailed"));
          }
        }
      }

      updateData({
        payment_status: "completed",
        appointment_id: appointmentId,
      });

      const { reset } = useBookingDraftStore.getState();
      await reset();

      nextStep();
    };

    const [coupon, setCoupon] = useState();

    const handlePayment = async (payload: any) => {
      if (isPaymentProcessing || isVerifying) return;

      const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || "webxpay";

      if (provider === "payhere" && (typeof window === "undefined" || !window.payhere)) {
        toast.error(t("errors.paymentLoading"));
        return;
      }

      const mainLayout = document.getElementById("main-app-layout");
      let currentAppointmentId = preExistingId;

      try {
        setIsPaymentProcessing(true);
        const practitionerId = bookingData.selectedDoctor?.id;
        const appointment_type_id = bookingData.appointmentType?.id;

        if (!isManualCheckout || !currentAppointmentId) {
          const res = await authFetch(
            `/api/booking/${practitionerId}/book-appointment`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                starts_at: bookingData.starts_at,
                ends_at: bookingData.ends_at,
                appointment_type_id,
                attendeeList: bookingData.selectedAttendees,
                coupon_code: coupon,
                pre_consultation: bookingData.pre_consultation,
                consent: bookingData.consent,
              }),
            },
          );

          const data = await res.json();
          if (!res.ok) {
            setIsPaymentProcessing(false);
            if (res.status === 409 || res.status === 404) goToStep(2);
            toast.error(data.error || t("errors.bookingFailed"));
            return;
          }
          currentAppointmentId = data?.appointment?.id;
        }

        appointmentIdRef.current = currentAppointmentId;

        const payRes = await authFetch(provider === "payhere" ? "/api/payhere" : "/api/webxpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name:
              user?.profile?.first_name || bookingData.fullName?.split(" ")[0],
            last_name:
              user?.profile?.last_name || bookingData.fullName?.split(" ").slice(1).join(" ") || "Lastname",
            email: user?.user?.email || bookingData.email,
            phone: user?.phone || bookingData.phone,
            address: bookingData.address || "Default",
            city: user?.profile?.city || "Default",
            country: user?.profile?.country || "Sri Lanka",
            appointment_id: currentAppointmentId,
            practitioner_id: practitionerId,
            platform_fee: bookingData.appointmentType?.platform_fee,
            consultation_fee: consultationFee,
          }),
        });

        if (!payRes.ok) {
          setIsPaymentProcessing(false);
          releaseAppointmentSlot(currentAppointmentId, "MISSING_DATA");
          toast.error(t("errors.paymentInitFailed"));
          return;
        }

        if (provider === "webxpay") {
          const responseData = await payRes.json();

          const { payment_fields } = responseData;

          const webxpayForm = document.createElement("form");
          webxpayForm.method = "POST";

          webxpayForm.action = "https://webxpay.com/index.php?route=checkout/billing";

          const fields = {
            ...payment_fields
          };

          Object.entries(fields).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = name;
              input.value = value.toString();
              webxpayForm.appendChild(input);
            }
          });

          document.body.appendChild(webxpayForm);
          webxpayForm.submit();
          return;
        }
        else {
          // PayHere
          const { payment } = await payRes.json();
          mainLayout?.classList.add("blur-md", "brightness-75", "pointer-events-none");

          const verifyPayment = async () => {
            try {
              const res = await authFetch(`/api/booking/check-status?appointmentId=${currentAppointmentId}`);
              if (!res.ok) return false;
              const data = await res.json();
              return data.status === 'confirmed' && data.payment_status === 'paid';
            } catch (err) {
              console.error("Polling error:", err);
              return false;
            }
          };

          window.payhere.onCompleted = async () => {
            setIsPaymentProcessing(false);
            mainLayout?.classList.remove("blur-md", "brightness-75", "pointer-events-none");
            setIsVerifying(true);

            let attempts = 0;
            let maxAttempts = 15;
            const checkInterval = setInterval(async () => {
              attempts++;
              const isVerified = await verifyPayment();
              if (isVerified) {
                clearInterval(checkInterval);
                await handlePostBookingActions(currentAppointmentId!);
                setIsVerifying(false);
                setPaymentDone(true);
                toast.success("Payment verified! Your appointment is successfully booked.");
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                setIsVerifying(false);
                toast.error("Booking cancelled, Payment could not be verified.");
                router.push("/dashboard/appointment");
              }
            }, 2000);
          };

          window.payhere.onDismissed = () => {
            mainLayout?.classList.remove("blur-md", "brightness-75", "pointer-events-none");
            setIsPaymentProcessing(false);
            releaseAppointmentSlot(currentAppointmentId, "PAYMENT_DISMISSED");
            toast.error(t("errors.cancelled"));
          };

          window.payhere.startPayment(payment);
        }
      } catch {
        setIsPaymentProcessing(false);
        mainLayout?.classList.remove(
          "blur-md",
          "brightness-75",
          "pointer-events-none",
        );
        toast.error(t("errors.unexpected"));
      }
    };

    return (
      <>
        <PaymentStepUI
          setCoupon={setCoupon}
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

        {mounted &&
          createPortal(
            <div className="relative z-[10001]">
              {(isPaymentProcessing || isExpired) && !isVerifying && (
                <div
                  className={`fixed top-0 left-0 right-0 z-[10001] transition-all duration-500 shadow-md ${isExpired || timeLeft < 60 ? "bg-red-600" : "bg-blue-600"}`}
                >
                  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <Loader2
                        size={18}
                        className={isExpired ? "" : "animate-spin"}
                      />
                      <span className="text-sm font-medium">
                        {isExpired
                          ? t("status.sessionExpired")
                          : t("status.completePayment")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] uppercase opacity-70">
                        {t("status.timeLeft")}
                      </span>
                      <span className="font-mono text-xl font-bold">
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isVerifying && (
                <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center bg-black/40">
                  <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-xl font-bold">
                      {t("status.verifying")}
                    </h3>
                    <p className="text-gray-600">{t("status.confirming")}</p>
                  </div>
                </div>
              )}
            </div>,
            document.body,
          )}
      </>
    );
  },
);

PaymentStep.displayName = "PaymentStep";
export default PaymentStep;
