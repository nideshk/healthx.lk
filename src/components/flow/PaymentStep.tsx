'use client';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';
import { AppointmentFormInputs } from '@/types/FormType';

interface Props {
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

const PaymentStep = forwardRef(({ prevStep, updateData, bookingData }: Props, ref) => {
  const [paymentDone, setPaymentDone] = useState(false);

  useImperativeHandle(ref, () => ({
    validateStep: () => {
      if (!paymentDone) {
        toast.error('Please complete your payment before proceeding.');
        return false;
      }
      return true;
    },
  }));

  const handlePayment = () => {
    setTimeout(() => {
      setPaymentDone(true);
      toast.success('Payment successful!');
      updateData({ payment_status: 'completed' });
    }, 1000);
  };

  const total = bookingData?.selectedDoctor?.fee || 1450;

  return (
    <div className=" h-fit py-12 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Payment</h2>
        <p className="text-gray-600 mb-8">
          Please confirm your payment to finalize the booking.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <p className="text-lg font-semibold text-gray-800">
            Amount Due: <span className="text-blue-700">LKR {total}</span>
          </p>
        </div>

        <button
          onClick={handlePayment}
          disabled={paymentDone}
          className={`w-full py-3 rounded-lg font-semibold transition ${
            paymentDone
              ? 'bg-green-600 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {paymentDone ? 'Payment Completed ✓' : 'Pay Now'}
        </button>

        <button
          onClick={prevStep}
          className="mt-6 text-sm text-gray-500 underline hover:text-gray-700"
        >
          Back to previous step
        </button>
      </div>
    </div>
  );
});

PaymentStep.displayName = 'PaymentStep';
export default PaymentStep;
