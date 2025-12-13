'use client';
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Star, Stethoscope, ArrowLeft, Mail } from 'lucide-react';
import { AppointmentFormInputs, Doctor } from '@/types/FormType';

const DoctorSelectionStep = forwardRef(
  (
    {
      nextStep,
      prevStep,
      updateData,
      bookingData,
    }: {
      nextStep: () => void;
      prevStep: () => void;
      updateData: (data: Partial<AppointmentFormInputs>) => void;
      bookingData: AppointmentFormInputs;
    },
    ref
  ) => {
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(
      bookingData.selectedDoctor || null
    );

    // ✅ Expose validateStep() to parent flow
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedDoctor) {
          toast.error('Please select a doctor before continuing.');
          return false;
        }
        return true;
      },
    }));

    // ✅ Fetch doctors based on selected service
    useEffect(() => {
  if (!bookingData?.selectedService?.slug) return;
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      
      const res = await axios.get(`/api/specialisation/${bookingData.selectedService.slug}`);
      console.log("fetching doctors for", bookingData);
      console.log("data from api", res.data);
      console.log("practitioners:", res.data.practitioners);
      const mapped = res.data.practitioners.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        registration: p.license_number,
        email: p.contact_email,
        qualification: p.qualification,
        profileImage: p.profile_picture_url || '/images/default-doctor.png',
        fee: 950 + p.price,
        currency: 'LKR',
        rating: {
          advice: 4.6,
          punctuality: 4.7,
          overall: 4.8,
        },
      }));
      setDoctors(mapped);
    } catch (err) {
      console.error('❌ Error fetching doctors:', err);
      toast.error('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  fetchDoctors();
}, [bookingData.selectedService?.slug]);


    const handleSelectDoctor = (doctor: Doctor) => {
      setSelectedDoctor(doctor);
      updateData({ selectedDoctor: doctor });
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
            Select a healthcare professional for{' '}
            <span className="font-semibold text-blue-600">
              {bookingData.selectedService.slug || 'this consultation'}
            </span>
            . Review their experience, qualifications, and fees before booking.
          </p>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No practitioners available for this specialization.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor: any) => {
                const isSelected = selectedDoctor?.id === doctor.id;

                return (
                  <div
                    key={doctor.id+""+doctor.email}
                    className={`rounded-2xl shadow-sm border transition-transform duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-300 scale-[1.02]'
                        : 'border-gray-100 hover:shadow-xl hover:scale-[1.02]'
                    }`}
                    onClick={() => handleSelectDoctor(doctor)}
                  >
                    {/* Header */}
                    <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                      <img
                        src={doctor.profileImage}
                        alt={doctor.name}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      />
                      <div>
                        <h2 className="font-semibold text-gray-800">
                          {doctor.name}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {doctor.qualification || 'General Practitioner'}
                        </p>
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          Verified Practitioner
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Consultation Fee</span>
                        <span className="font-semibold text-gray-800">
                          {doctor.currency} {doctor.fee}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Email</span>
                        <span className="text-blue-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {doctor.email || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2 mt-2">
                        <span className="text-gray-500">Overall Rating</span>
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
                        className={`w-full py-2 rounded-lg font-semibold text-sm transition ${
                          isSelected
                            ? 'bg-white text-blue-700 border border-blue-600 hover:bg-blue-50'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSelected ? 'Selected ✓' : 'Select Doctor'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
);

DoctorSelectionStep.displayName = 'DoctorSelectionStep';
export default DoctorSelectionStep;
