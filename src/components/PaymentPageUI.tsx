'use client';

import React from 'react';
import {
    User, Calendar, ClipboardList, Loader2, CheckCircle2
} from 'lucide-react';
import { AppointmentFormInputs } from '@/types/FormType';

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
    handlePayment: () => void;
    prevStep: () => void;
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
    paymentDone,
    handlePayment,
    prevStep,
}) => {
    const doctor = bookingData.selectedDoctor;
    const type = bookingData.appointmentType;
    const service = bookingData.selectedService;
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
                            <div className='flex justify-between'>
                                <p className="text-lg font-semibold">{doctor?.name}, <span className='text-sm'>{doctor?.qualification}</span></p>
                                <p className='text-sm text-gray-600'>{doctor?.license_number}</p>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">{doctor?.profile_bio}</p>
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

                        <div className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Attendees</h3>
                            {bookingData.selectedAttendees?.length === 0 ? (
                                <p className="text-sm text-gray-500">No additional attendees added.</p>
                            ) : (
                                <ul className="flex flex-wrap gap-2">
                                    {bookingData.selectedAttendees?.map((attendee) => (
                                        <li key={attendee} className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                                            {attendee}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN (Sticky Sidebar) */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-2xl bg-white shadow sticky top-24">
                            <h3 className="text-xl font-bold mb-5">Pricing Summary</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span>Consultation</span>
                                    <span>LKR {consultationFee}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Additional Attendee Fee</span>
                                    <span>LKR {attendeeCount * 100}</span>
                                </div>
                                <hr />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-blue-700">LKR {consultationFee + (attendeeCount * 100)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={isPaymentProcessing || isVerifying}
                                className="w-full mt-6 py-3 rounded-lg text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 flex items-center justify-center gap-2"
                            >
                                {isPaymentProcessing ? <Loader2 size={20} className="animate-spin" /> : 'Pay Now →'}
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
};

export default PaymentStepUI;