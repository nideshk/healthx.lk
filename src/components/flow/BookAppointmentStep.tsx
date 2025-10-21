'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Clock } from 'lucide-react';
import { AppointmentFormInputs } from './AppointmentBookingFlow';
import Calendar from '../atom/Calendar/Calendar';

interface BookAppointmentStepProps {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}

export default function BookAppointmentStep({
  nextStep,
  prevStep,
  updateData,
  bookingData,
}: BookAppointmentStepProps) {
  const { selectedDoctor } = bookingData;
  const [loading, setLoading] = useState(true);
  const [practitionerData, setPractitionerData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedDoctor?.registration) return;
      setLoading(true);
      try {
        const res = await axios.get(`/api/practitioners/${selectedDoctor.registration}`);
        setPractitionerData(res.data);
      } catch (err) {
        console.error('Error fetching practitioner data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [selectedDoctor]);

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      updateData({
        appointmentDate: new Date(selectedDate),
        appointmentTimeSlot: selectedTime,
      });
      nextStep();
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        Loading practitioner details...
      </div>
    );

  if (!practitionerData)
    return <p className="text-center text-red-500">No data available.</p>;

  const { practitioner, availability } = practitionerData;

  return (
    <div className="min-h-screen rounded-2xl bg-gradient-to-b from-blue-50 via-white to-blue-50 font-sans py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={prevStep}
          className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-900">
          Book Appointment
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Schedule your individual appointment for{' '}
          <span className="text-blue-600 font-medium">
            {bookingData.selectedServiceTitle}
          </span>
        </p>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-10 mt-10">
          {/* LEFT: Doctor Info */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {practitioner.title} {practitioner.name}
                </h2>
                <p className="text-gray-600 text-sm">
                  {practitioner.designation}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Registration: {practitioner.id}
                </p>
              </div>
              <p className="text-blue-600 font-bold text-lg">
                LKR {selectedDoctor?.fee.toLocaleString()}
              </p>
            </div>

            {/* About */}
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">
                About Dr. {practitioner.name.split(' ')[0]}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {practitioner.description}
              </p>
            </div>

            {/* Experience (Optional placeholder) */}
            <div className="mt-4 border-t pt-3 text-sm text-gray-600">
              <p>🏥 Over 10 years of experience in family and preventive medicine.</p>
              <p>💬 Dedicated to providing compassionate patient care.</p>
              <p>🎓 Certified General Physician with pediatric specialization.</p>
            </div>
          </div>

          {/* RIGHT: Calendar + Slots */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            {/* Calendar Component */}
            <Calendar
              value={selectedDate ? new Date(selectedDate) : undefined}
              onChange={(date) => {
                if (!date) return;
                const dateStr = date.toISOString().split('T')[0];
                setSelectedDate(dateStr);
                setSelectedTime(null);
              }}
              availableDates={Object.keys(availability.grouped)} // show blue dots
              minDate={new Date()}
              theme="light"
            />

            {/* Available Slots */}
            {selectedDate && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Available Slots for{' '}
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h4>

                <div className="flex flex-wrap gap-2">
                  {availability.grouped[selectedDate]?.length ? (
                    availability.grouped[selectedDate].map((time: string) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-1.5 rounded-md border text-sm transition ${
                          selectedTime === time
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      No slots available for this date
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleConfirm}
                disabled={!selectedDate || !selectedTime}
                className={`px-5 py-2 rounded-lg text-white font-semibold transition ${
                  selectedDate && selectedTime
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
