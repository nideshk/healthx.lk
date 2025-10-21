'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Stethoscope, ArrowLeft } from 'lucide-react';
import { AppointmentFormInputs, Doctor } from './AppointmentBookingFlow';

export default function DoctorSelectionStep({
  nextStep,
  prevStep,
  updateData,
  bookingData,
}: {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
}) {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      if (!bookingData.selectedServiceId) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/services/${bookingData.selectedServiceId}/practitioners`
        );
        const mapped = res.data.practitioners.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          registration: p.id,
          fee: 3500 + Math.floor(Math.random() * 1000),
          currency: 'LKR',
          rating: {
            advice: 4.6,
            punctuality: 4.7,
            overall: 4.8,
          },
        }));
        setDoctors(mapped);
      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [bookingData.selectedServiceId]);

  const handleSelectDoctor = (doctor: Doctor) => {
    updateData({ selectedDoctor: doctor });
    nextStep();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={prevStep}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            Choose Your Practitioner
          </h1>
          <div />
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Select from our available healthcare professionals for{' '}
          <span className="font-semibold text-blue-600">
            {bookingData.selectedServiceTitle || 'this consultation'}
          </span>
          . You can view their experience, fees, and rating before booking.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No practitioners available for this service.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor:any) => (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-transform duration-200 hover:scale-[1.02] cursor-pointer"
                onClick={() => handleSelectDoctor(doctor)}
              >
                {/* Header Section */}
                <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">{doctor.name}</h2>
                    <p className="text-xs text-green-600 font-medium mt-0.5">
                      Verified Practitioner
                    </p>
                  </div>
                </div>

                {/* Body Section */}
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Consultation Fee</span>
                    <span className="font-semibold text-gray-800">
                      {doctor.currency} {doctor.fee}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Advice</span>
                    <span className="text-blue-600 font-semibold">
                      {doctor.rating.advice.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Punctuality</span>
                    <span className="text-blue-600 font-semibold">
                      {doctor.rating.punctuality.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <span className="text-gray-500">Overall</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.round(doctor.rating.overall)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-semibold text-gray-700">
                        {doctor.rating.overall.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100">
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm transition"
                  >
                    Select Doctor
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
