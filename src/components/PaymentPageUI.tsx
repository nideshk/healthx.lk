"use client";

import React, { useState } from "react";
import {
  User,
  Calendar,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Megaphone,
  Target,
  MessageSquare,
  ClipboardCheck,
  Mail,
  UserPlus,
  Users,
  TimerIcon,
  User2,
} from "lucide-react";
import { AppointmentFormInputs } from "@/types/FormType";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import Price from "@/components/common/Price";

interface PaymentStepUIProps {
  bookingData: AppointmentFormInputs;
  consultationFee: number;
  attendeeCount: number;
  timeLeft: number;
  formatTime: (seconds: number) => string;
  isPaymentProcessing: boolean;
  isVerifying: boolean;
  isExpired: boolean;
  paymentDone: boolean;
  handlePayment: (payload?: any) => void;
  prevStep: () => void;
  setCoupon: (coupon: any) => void;
}

const PaymentStepUI: React.FC<PaymentStepUIProps> = ({
  bookingData,
  consultationFee,
  attendeeCount,
  timeLeft,
  formatTime,
  isPaymentProcessing,
  isVerifying,
  isExpired,
  handlePayment,
  prevStep,
  setCoupon,
}) => {
  const t = useTranslations("paymentUI");
  console.log("booking data", bookingData);
  const consent = (() => {
    const raw = bookingData?.consent ?? bookingData?.consents;
    if (Array.isArray(raw)) {
      // From /api/booking/details, consents is an array
      const first = raw[0];
      return { telehealth: first?.telehealth ?? false, terms: first?.terms ?? false };
    }
    return raw ?? { telehealth: false, terms: false };
  })();
  const doctor = bookingData.selectedDoctor;
  const type = bookingData.appointmentType;
  const service = bookingData.selectedService;
  
  const normalizePre = (pre: any) => {
    if (!pre) return { concern: null, outcome: null, duration: null, referral: null };
    if (pre.note) {
      // Patient flow structure
      return {
        concern: pre.note?.concern ?? null,
        outcome: pre.note?.outcome ?? null,
        duration: pre.note?.duration ?? null,
        referral: pre.referral ?? null,
      };
    }
    // Admin flow structure
    return {
      concern: pre.concern ?? null,
      outcome: pre.goal ?? null,    
      duration: pre.duration ?? null,
      referral: pre.referral ?? null,
    };
  };
  const preConsult = normalizePre(bookingData?.pre_consultation);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const { user } = useAuth();

  const platformFee = attendeeCount * 500;
  const baseTotal = consultationFee + platformFee;
  const discountAmount = appliedCoupon?.discount?.discount_total || 0;
  const finalTotal = Math.max(baseTotal - discountAmount, 0);

  const applyCoupon = async () => {
    if (!couponCode) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode,
          patient_id: user?.patient_id,
          practitioner_id: doctor?.id,
          pricing: {
            consultation_fee: consultationFee,
            platform_fee: platformFee,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        setCouponError(data.error || t("errors.invalidCoupon"));
        return;
      }

      setAppliedCoupon(data);
      setCoupon(couponCode);
    } catch {
      setCouponError(t("errors.couponFailed"));
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setCoupon(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
          {t("title")}
        </h1>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Doctor */}
            <div className="p-6 rounded-2xl bg-white shadow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                {t("doctorDetails")}
              </h3>

              <div className="flex justify-between">
                <div className="flex gap-4">
                  {doctor?.profileImage ? <img
                    src={doctor?.profileImage}
                    className="w-20 h-20 rounded-full object-cover"
                    alt=""
                  /> :
                    <User2 />
                  }
                  <div>
                    <p className="text-lg font-semibold">
                      {doctor?.full_name || doctor?.name}{" "}
                      <span className="text-sm">
                        {doctor?.qualification}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600">
                      {doctor?.specialization}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {doctor?.license_number}
                </p>
              </div>

              <p className="text-sm text-gray-600 mt-3">
                {doctor?.profile_bio}
              </p>
            </div>

            {/* Appointment */}
            <div className="p-6 rounded-2xl bg-white shadow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {t("appointmentDetails")}
              </h3>
              <p>
                <strong>{t("type")}:</strong> {type?.name}
              </p>
              <p>
                <strong>{t("duration")}:</strong> {type?.duration_mins}{" "}
                {t("minutes")}
              </p>
              <p>
                <strong>{t("date")}:</strong>{" "}
                {bookingData.starts_at
                  ? new Date(
                    bookingData.starts_at
                  ).toLocaleDateString()
                  : "—"}
              </p>
              <p>
                <strong>{t("time")}:</strong>{" "}
                {bookingData.starts_at
                  ? new Date(
                    bookingData.starts_at
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : "—"}
              </p>
            </div>

            {/* Service */}
            <div className="p-6 rounded-2xl bg-white shadow">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {t("service")}
              </h3>
              <p>{service?.name}</p>
            </div>
            {/* CONSENT & POLICY STATUS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">
                Consents & Agreements
              </h3>

              <div className="space-y-3">
                {/* Telehealth Consent */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${consent.telehealth ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Telehealth Consultation Consent</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${consent.telehealth ? 'text-green-700' : 'text-red-700'}`}>
                    {consent.telehealth ? "ACCEPTED" : "DECLINED"}
                  </span>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${consent.terms ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Terms of Service & Privacy Policy</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${consent.terms ? 'text-green-700' : 'text-red-700'}`}>
                    {consent.terms ? "ACCEPTED" : "DECLINED"}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                  Pre-Consultation Summary
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Primary Concern */}
                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Primary Concern / Symptoms</p>
                    <p className="text-gray-900 mt-1 font-medium leading-relaxed">
                      {preConsult.concern || "No specific concern provided."}
                    </p>
                  </div>
                </div>

                {/* Expected Outcome */}
                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Target className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Desired Outcome</p>
                    <p className="text-gray-900 mt-1 font-medium leading-relaxed">
                      {preConsult.outcome || "No specific outcome mentioned."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <TimerIcon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Concern Duration</p>
                    <p className="text-gray-900 mt-1 font-medium leading-relaxed">
                      {preConsult.duration || "No specific duration mentioned."}
                    </p>
                  </div>

                </div>

                {/* Referral Source */}
                <div className="pt-4 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Megaphone className="w-4 h-4" />
                      <span className="text-sm font-medium">How did you hear about us?</span>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                      {preConsult.referral}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                    Participant Roster
                  </h3>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {attendeeCount} Total
                </span>
              </div>

              <div className="p-6">
                {bookingData.selectedAttendees.length > 0 ? (
                  <div className="space-y-3">
                    {bookingData.selectedAttendees.map((email, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-blue-100 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{email.email} - {email.relationship}</p>
                            <p className="text-xs text-gray-500 italic">Confirmed Participant</p>
                          </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No additional attendees selected.</p>
                  </div>
                )}

                {/* Info Tip */}
                <div className="mt-6 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    All listed attendees will receive a secure meeting link and calendar invitation via their registered email addresses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-2xl bg-white shadow sticky top-24">
              <h3 className="text-xl font-bold mb-5">
                {t("pricingSummary")}
              </h3>

              {/* Countdown */}
              {isExpired ? (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                  <p className="text-sm font-semibold text-red-600">
                    {t("status.sessionExpired")}
                  </p>
                </div>
              ) : (
                <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                  <p className="text-xs text-blue-600 font-semibold uppercase">
                    {t("status.timeLeft")}
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatTime(timeLeft)}
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {t("status.completePayment")}
                  </p>
                </div>
              )}

              {/* Coupon */}
              <div className="mb-4 space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t("haveCoupon")}
                </label>

                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder={t("enterCode")}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                    disabled={couponLoading || !!appliedCoupon}
                  />

                  {!appliedCoupon ? (
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400"
                    >
                      {couponLoading
                        ? t("applying")
                        : t("apply")}
                    </button>
                  ) : (
                    <button
                      onClick={removeCoupon}
                      className="px-3 text-sm text-red-600 underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {couponError && (
                  <p className="text-sm text-red-600">
                    {couponError}
                  </p>
                )}

                {appliedCoupon && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t("couponApplied")}
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t("consultation")}</span>
                  <span><Price amount={consultationFee} /></span>
                </div>

                <div className="flex justify-between">
                  <span>{t("additionalAttendees")}</span>
                  <span><Price amount={platformFee} /></span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-700">
                    <span>{t("couponDiscount")}</span>
                    <span>- <Price amount={discountAmount} /></span>
                  </div>
                )}

                <hr />

                <div className="flex justify-between text-lg font-bold">
                  <span>{t("total")}</span>
                  <span className="text-blue-700">
                    <Price amount={finalTotal} />
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  handlePayment({
                    coupon_code: appliedCoupon
                      ? couponCode
                      : null,
                    discount: appliedCoupon?.discount || null,
                    final_amount: finalTotal,
                  })
                }
                disabled={
                  isPaymentProcessing ||
                  isVerifying ||
                  isExpired
                }
                className="w-full mt-6 py-3 rounded-lg text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {isPaymentProcessing ? (
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                ) : (
                  t("payNow")
                )}
              </button>

              <button
                onClick={prevStep}
                disabled={isPaymentProcessing}
                className="mt-4 w-full text-sm text-gray-600 underline"
              >
                {t("back")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStepUI;
