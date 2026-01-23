'use client';

import React, { useState } from 'react';
import {
    User,
    Calendar,
    ClipboardList,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { AppointmentFormInputs } from '@/types/FormType';
import { useAuth } from '@/contexts/AuthContext';

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
    isPaymentProcessing,
    isVerifying,
    handlePayment,
    prevStep,
    setCoupon
}) => {
    const doctor = bookingData.selectedDoctor;
    const type = bookingData.appointmentType;
    const service = bookingData.selectedService;

    /* ---------------- Coupon State ---------------- */
    const [couponCode, setCouponCode] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const { user } = useAuth();

    /* ---------------- Pricing ---------------- */
    const platformFee = attendeeCount * 100;
    const baseTotal = consultationFee + platformFee;

    const discountAmount =
        appliedCoupon?.discount?.discount_total || 0;

    const finalTotal = Math.max(baseTotal - discountAmount, 0);

    /* ---------------- Coupon Validation ---------------- */
    const applyCoupon = async () => {
        if (!couponCode) return;

        setCouponLoading(true);
        setCouponError(null);

        try {
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                setCouponError(data.error || 'Invalid coupon');
                return;
            }

            setAppliedCoupon(data);
            setCoupon(couponCode);
        } catch (err) {
            setCouponError('Failed to validate coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError(null);
    };

    /* ---------------- Render ---------------- */
    return (
        <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
                    Review & Complete Payment
                </h1>

                <div className="grid lg:grid-cols-3 gap-10">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Doctor */}
                        <div className="p-6 rounded-2xl bg-white shadow">
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Doctor Details
                            </h3>

                            <div className="flex justify-between">
                                <div className="flex gap-4">
                                    <img
                                        src={doctor?.profileImage || '/doctor.png'}
                                        className="w-20 h-20 rounded-full object-cover"
                                        alt=""
                                    />
                                    <div>
                                        <p className="text-lg font-semibold">
                                            {doctor?.name}{' '}
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
                                Appointment Details
                            </h3>
                            <p><strong>Type:</strong> {type?.name}</p>
                            <p><strong>Duration:</strong> {type?.duration_mins} mins</p>
                            <p><strong>Date:</strong> {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleDateString() : '—'}</p>
                            <p><strong>Time:</strong> {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>

                        {/* Service */}
                        <div className="p-6 rounded-2xl bg-white shadow">
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                                Service
                            </h3>
                            <p>{service?.name}</p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-white shadow sticky top-24">
                            <h3 className="text-xl font-bold mb-5">
                                Pricing Summary
                            </h3>

                            {/* Coupon */}
                            <div className="mb-4 space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    Have a coupon?
                                </label>

                                <div className="flex gap-2">
                                    <input
                                        value={couponCode}
                                        onChange={e =>
                                            setCouponCode(e.target.value.toUpperCase())
                                        }
                                        placeholder="ENTER CODE"
                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                                        disabled={couponLoading || !!appliedCoupon}
                                    />

                                    {!appliedCoupon ? (
                                        <button
                                            onClick={applyCoupon}
                                            disabled={couponLoading || !couponCode}
                                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400"
                                        >
                                            {couponLoading ? 'Applying…' : 'Apply'}
                                        </button>
                                    ) : (
                                        <></>
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
                                        Coupon applied successfully
                                    </div>
                                )}
                            </div>

                            {/* Pricing */}
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span>Consultation</span>
                                    <span>LKR {consultationFee}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span>Additional Attendees</span>
                                    <span>LKR {platformFee}</span>
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between text-green-700">
                                        <span>Coupon Discount</span>
                                        <span>- LKR {discountAmount}</span>
                                    </div>
                                )}

                                <hr />

                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-blue-700">
                                        LKR {finalTotal}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() =>
                                    handlePayment({
                                        coupon_code: appliedCoupon ? couponCode : null,
                                        discount: appliedCoupon?.discount || null,
                                        final_amount: finalTotal,
                                    })
                                }
                                disabled={isPaymentProcessing || isVerifying}
                                className="w-full mt-6 py-3 rounded-lg text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 flex items-center justify-center gap-2"
                            >
                                {isPaymentProcessing ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    'Pay Now →'
                                )}
                            </button>

                            <button
                                onClick={prevStep}
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
};

export default PaymentStepUI;
