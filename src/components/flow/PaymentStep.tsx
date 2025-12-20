'use client';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { AppointmentFormInputs } from '@/types/FormType';
import {
  CheckCircle2,
  Calendar,
  User,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { uploadAttachmentAfterBooking } from '@/lib/s3/uploadAttachmentAfterBooking';

interface Props {
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  goToStep : (step:number)=> void;
}

const PaymentStep = forwardRef(
  ({ prevStep, updateData, bookingData, goToStep }: Props, ref) => {
    const [paymentDone, setPaymentDone] = useState(false);
    console.log(bookingData)
    const router = useRouter();
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!paymentDone) {
          toast.error('Please complete the payment to finalize.');
          return false;
        }
        return true;
      },
    }));

  const handlePayment = async () => {
  try {

    const practitionerId = bookingData.selectedDoctor?.id;
    const date = bookingData.starts_at?.split("T")[0];
    const time = new Date(bookingData.starts_at || "")
      .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const appointment_type_id = bookingData?.appointmentType?.id;

    if (!practitionerId || !date || !time || !appointment_type_id) {
      toast.error(`Missing booking details. Please go back and review, ${practitionerId + " " +  date  + " "+  time  + " "+ appointment_type_id}` 
      );
      return;
    }

    const res = await fetch(
      `/api/booking/${practitionerId}/book-appointment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, appointment_type_id }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      if(res.status=== 409){
        toast.error(data.error || "Booking failed");
        goToStep(2);
      }
      return;
    }

   toast.success("Appointment booked successfully!");
setPaymentDone(true);

const appointmentId = data?.appointment?.id;

// 🔑 Upload attachment AFTER booking
if (pre?.attachment instanceof File && appointmentId) {
  try {
    await uploadAttachmentAfterBooking(pre.attachment, appointmentId);
  } catch (err) {
    console.error(err);
    toast.warn(
      "Appointment booked, but attachment upload failed. You can re-upload later."
    );
  }
}

updateData({
  payment_status: "completed",
  appointment_id: appointmentId,
});

router.push("/dashboard/appointment");
  } catch (err) {
    console.error(err);
    toast.error("Unexpected error while booking");
  }
};

    // Pricing breakdown
    const consultationFee = bookingData?.selectedDoctor?.fee || 1450;
    const serviceFee = Math.round(consultationFee * 0.05);
    const tax = Math.round((consultationFee + serviceFee) * 0.08);
    const totalAmount = consultationFee + serviceFee + tax;
    const attendeeCount = bookingData?.selectedAttendees?.length || 1;  
    const attendeeList = bookingData?.selectedAttendees || [];
    const doctor = bookingData.selectedDoctor;
    const type = bookingData.appointmentType;
    const service = bookingData.selectedService;
    const pre = bookingData.pre_consultation || {};
    const consent = bookingData.consent || {};
    console.log("Rendering PaymentStep with bookingData:", doctor);
    return (
      <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto">

          {/* ---------------- PAGE TITLE ---------------- */}
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-10">
            Review & Complete Payment
          </h1>

          {/* ---------------- TWO COLUMN LAYOUT ---------------- */}
          <div className="grid lg:grid-cols-3 gap-10">

            {/* LEFT COLUMN – REVIEW SECTIONS */}
            <div className="lg:col-span-2 space-y-6">

              {/* ---- GLASS CARD STYLE ---- */}
              {/** Doctor Card */}
              <div className="
                p-6 rounded-2xl 
                bg-white/60 backdrop-blur-md 
                shadow-[0_4px_12px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] 
                transition-all
              ">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> Doctor Details
                </h3>

                <div className="flex items-center gap-4">
                  <img
                    src={doctor?.profileImage || '/images/default-doctor.png'}
                    className="w-16 h-16 rounded-xl object-cover border"
                  />
                  <div>
                    <p className="text-lg font-semibold">{doctor?.full_name}</p>
                    <p className="text-sm text-gray-600">{doctor?.profile_bio}</p>
                  </div>
                </div>
              </div>

              {/** Appointment Details */}
              <div className="
                p-6 rounded-2xl 
                bg-white/60 backdrop-blur-md 
                shadow-[0_4px_12px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]
                transition-all
              ">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" /> Appointment Details
                </h3>

                <p><strong>Type:</strong> {type?.name}</p>
                <p><strong>Duration:</strong> {type?.duration_mins} mins</p>
                <p><strong>Date:</strong> {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleDateString() : '—'}</p>
                <p>
                  <strong>Time:</strong>{' '}
                  {bookingData.starts_at ? new Date(bookingData.starts_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : '—'}
                </p>
              </div>

              {/** Service */}
              <div className="
                p-6 rounded-2xl 
                bg-white/60 backdrop-blur-md 
                shadow-[0_4px_12px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]
                transition-all
              ">
                <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
                  <ClipboardList className="w-5 h-5 text-blue-600" /> Service
                </h3>
                <p className="font-medium">{service?.name}</p>
                <p className="text-sm text-gray-600">{service?.description}</p>
              </div>

              {/** Pre-Consultation */}
              <div className="
                p-6 rounded-2xl 
                bg-white/60 backdrop-blur-md 
                shadow-[0_4px_12px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]
                transition-all
              ">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Pre-Consultation
                </h3>

                <p><strong>Main Concern:</strong> {pre?.note?.concern || '—'}</p>
                <p><strong>Expected Outcome:</strong> {pre?.note?.outcome || '—'}</p>
                <p><strong>Referral:</strong> {pre?.referral || '—'}</p>
              </div>
              <div className='shadow-sm p-4 rounded-lg bg-white/60 backdrop-blur-md'>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                 Additional Attendees ({attendeeCount > 1 ? attendeeCount - 1 : 0})
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {attendeeList.length > 0 ? (
                    attendeeList.map((attendee, index) => (
                      <li key={index}>
                        {attendee}
                      </li>
                    ))
                  ) : (
                    <li>No additional attendees.</li>
                  )}
                </ul>
              </div>
              {/** Consents */}
              <div className="
                p-6 rounded-2xl 
                bg-white/60 backdrop-blur-md 
                shadow-[0_4px_12px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]
                transition-all
              ">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Consents
                </h3>

                <p className="flex items-center gap-2">
                  Telehealth Consent:
                  {consent.telehealth ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-red-600">✗ Not Accepted</span>
                  )}
                </p>

                <p className="flex items-center gap-2 mt-2">
                  Terms & Conditions:
                  {consent.terms ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <span className="text-red-600">✗ Not Accepted</span>
                  )}
                </p>
              </div>
            </div>

            {/* ---------------- RIGHT COLUMN — STICKY PAYMENT SUMMARY ---------------- */}
            <div className="lg:col-span-1">
              <div
                className="
                p-6 rounded-2xl 
                bg-white/70 backdrop-blur-lg 
                shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                ring-1 ring-white/40
                sticky top-24
              "
              >
                <h3 className="text-xl font-bold text-gray-900 mb-5">
                  Pricing Summary
                </h3>

                <div className="space-y-3 text-gray-800">
                  <div className="flex justify-between">
                    <span>Consultation Fee</span>
                    <span>LKR {consultationFee}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Platform Fee (5%)</span>
                    <span>LKR {serviceFee}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>VAT (8%)</span>
                    <span>LKR {tax}</span>
                  </div>

                  <hr className="my-4" />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-blue-700">LKR {totalAmount}</span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={paymentDone}
                  className="
                    w-full mt-6 py-3 rounded-lg
                    text-lg font-semibold
                    transition-all shadow-md
                    bg-blue-600 hover:bg-blue-700 text-white
                    disabled:bg-green-600 disabled:cursor-not-allowed
                  "
                >
                  {paymentDone ? 'Payment Completed ✓' : 'Pay Now →'}
                </button>

                <button
                  onClick={prevStep}
                  className="mt-4 w-full text-sm text-gray-600 underline hover:text-gray-800"
                >
                  ← Back to Previous Step
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
