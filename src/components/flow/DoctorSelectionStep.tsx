'use client';

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Star, ArrowLeft, Mail, BadgeCheck, GraduationCap, ChevronRight, Loader2 } from 'lucide-react';
import { AppointmentFormInputs, Doctor } from '@/types/FormType';
import Loader from '@/components/atom/Loader/Loader';

const DoctorSelectionStep = forwardRef(
  (
    {
      nextStep,
      prevStep,
      updateData,
      bookingData,
    }: {
      nextStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
      prevStep: (opts?: { override?: Partial<AppointmentFormInputs> }) => void;
      updateData: (data: Partial<AppointmentFormInputs>) => void;
      bookingData: AppointmentFormInputs;
    },
    ref
  ) => {
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | number | null>(
      bookingData.selectedDoctor?.id || null
    );

    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedDoctorId) {
          toast.error('Please select a healthcare professional.');
          return false;
        }
        return true;
      },
    }));

    useEffect(() => {
      if (!bookingData?.selectedService?.slug) return;
      const fetchDoctors = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/api/specialisation/${bookingData.selectedService.slug}`);
          const mapped = res.data.practitioners.map((p: any) => ({
            id: p.id,
            name: p.full_name,
            license_number: p.license_number,
            email: p.contact_email,
            qualification: p.qualification,
            profileImage: p.profile_picture_url || '/images/default-doctor.png',
            fee: 950 + p.price,
            currency: 'LKR',
            rating: { overall: 4.8 },
          }));
          setDoctors(mapped);
        } catch (err) {
          toast.error('Unable to retrieve practitioner list.');
        } finally {
          setLoading(false);
        }
      };
      fetchDoctors();
    }, [bookingData.selectedService?.slug]);

    const handleSelectDoctor = async (doctor: Doctor) => {
      if (isSaving) return;
      
      setSelectedDoctorId(doctor.id);
      setIsSaving(true);
      
      // Update local state and trigger parent nextStep immediately
      updateData({ selectedDoctor: doctor });
      
      try {
        await nextStep({ override: { selectedDoctor: doctor } });
      } catch (err) {
        setIsSaving(false);
      }
    };

    return (
      <div className="py-6 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4">
          
          {/* Header & Back Button */}
          <div className="mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <button
                onClick={() => prevStep()}
                className="flex items-center gap-1.5 text-slate-400 hover:text-teal-600 font-bold text-xs mb-3 transition-colors uppercase tracking-wider group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" /> 
                Back to specialisation
              </button>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Choose your Doctor
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Available specialists for <span className="text-teal-600 font-bold">{bookingData.selectedService?.name}</span>
              </p>
            </div>
            
            <div className="hidden md:block">
               <div className="flex -space-x-2">
                  {doctors.slice(0, 3).map((d, i) => (
                    <img key={i} src={d.profileImage} className="w-8 h-8 rounded-full border-2 border-white object-cover" alt="" />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-teal-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-teal-600">
                    {doctors.length}+
                  </div>
               </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader size="md" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Finding best specialists...</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor: any) => {
                const isSelected = selectedDoctorId === doctor.id;

                return (
                  <div
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    className={`relative flex flex-col rounded-[1.5rem] border-2 transition-all duration-300 cursor-pointer overflow-hidden group ${
                      isSelected
                        ? 'bg-teal-50/50 border-teal-500 shadow-xl shadow-teal-100/50 scale-[1.02]'
                        : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-100'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="relative">
                          <img
                            src={doctor.profileImage}
                            alt={doctor.name}
                            className={`w-16 h-16 rounded-2xl object-cover border-2 transition-colors ${
                                isSelected ? 'border-teal-200' : 'border-slate-50'
                            }`}
                          />
                          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                             <div className="bg-teal-500 rounded-full p-0.5">
                                <BadgeCheck className="w-3 h-3 text-white" />
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-amber-700">{doctor.rating.overall}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-teal-700 transition-colors">
                          Dr. {doctor.name}
                        </h3>
                        <p className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mt-1">Verified Practitioner</p>
                      </div>

                      <div className="space-y-2.5 mb-6">
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                            <GraduationCap className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold truncate">{doctor.qualification}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold truncate">{doctor.email}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</p>
                          <p className="text-lg font-black text-slate-900">
                             {doctor.currency} {doctor.fee.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isSelected ? 'bg-teal-500 text-white rotate-90' : 'bg-slate-900 text-white group-hover:bg-teal-600'
                        }`}>
                          {isSaving && isSelected ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                      </div>
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