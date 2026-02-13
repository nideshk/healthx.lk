'use client';

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Star,
  ArrowLeft,
  Mail,
  BadgeCheck,
  GraduationCap,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { AppointmentFormInputs, Doctor } from '@/types/FormType';
import Loader from '@/components/atom/Loader/Loader';
import { useTranslations } from 'next-intl';

const DoctorSelectionStep = forwardRef(
  ({ nextStep, prevStep, updateData, bookingData }: any, ref) => {
    const t = useTranslations('doctorSelection');

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<
      string | number | null
    >(bookingData.selectedDoctor?.id || null);

    // NEW: sort state
    const [sortOrder, setSortOrder] = useState<'lowToHigh' | 'highToLow'>(
      'lowToHigh'
    );

    // Expose validation to the parent multi-step component
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedDoctorId) {
          toast.error(t('selectDoctorError'));
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
          const res = await axios.get(
            `/api/specialisation/${bookingData.selectedService.slug.toLowerCase()}`
          );
          const mapped = res.data.practitioners.map((p: any) => ({
            id: p.id,
            name: p.full_name,
            license_number: p.license_number,
            email: p.contact_email,
            qualification: p.qualification,
            profileImage: p.profile_picture_url || null,
            // fee: 950 + (p.fees || 0),
            startingPrice: 950 + (p.starting_price || 0),
            endingPrice: 950 + (p.ending_price || 0 ),
            currency: 'LKR',
            rating: { overall: 4.8 },
          }));
          setDoctors(mapped);
        } catch (err) {
          toast.error(t('fetchDoctorError'));
        } finally {
          setLoading(false);
        }
      };
      fetchDoctors();
    }, [bookingData.selectedService?.slug]);

    const handleSelectDoctor = async (doctor: Doctor) => {
      if (isSaving) return;

      setIsSaving(true);
      setSelectedDoctorId(doctor.id);

      updateData({ selectedDoctor: doctor });

      setTimeout(async () => {
        try {
          await nextStep({
            override: { selectedDoctor: doctor },
          });
        } catch (err) {
          console.error('Navigation error:', err);
          setIsSaving(false);
        }
      }, 300);
    };

    // NEW: sorted doctors
    const sortedDoctors = [...doctors].sort((a, b) => {
      const priceA = a.startingPrice ?? 0;
      const priceB = b.startingPrice ?? 0;

      if (sortOrder === 'lowToHigh') {
        return priceA - priceB;
      }

      return priceB - priceA;
    });


    return (
      <div className="py-6 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => prevStep()}
                className="flex items-center gap-1.5 text-slate-400 hover:text-teal-600 font-bold text-xs mb-3 transition-colors uppercase tracking-wider group"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                {t('backToSpecialization')}
              </button>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {t('title')}
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {t('subtitle')}{' '}
                <span className="text-teal-600 font-bold">
                  {bookingData.selectedService?.name}
                </span>
              </p>
            </div>

            {/* Sort + avatars */}
            <div className="flex items-center gap-4">
              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  {t('sortBy') || 'Sort'}
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(
                      e.target.value as 'lowToHigh' | 'highToLow'
                    )
                  }
                  className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-teal-500"
                >
                  <option value="lowToHigh">
                    {t('priceLowHigh') || 'Price: Low to High'}
                  </option>
                  <option value="highToLow">
                    {t('priceHighLow') || 'Price: High to Low'}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader size="md" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                {t('loadingDoctors')}
              </p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 font-bold">
                {t('noDoctors')}
              </p>
              <button
                onClick={() => prevStep()}
                className="mt-4 text-teal-600 underline font-bold"
              >
                {t('tryAnotherService')}
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedDoctors.map((doctor: any) => {
                const isSelected = selectedDoctorId === doctor.id;

                return (
                  <div
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor)}
                    className={`relative flex flex-col rounded-[2rem] border-2 transition-all duration-500 cursor-pointer overflow-hidden group ${isSelected
                      ? 'bg-teal-50 border-teal-500 shadow-xl shadow-teal-200/50 scale-[1.02]'
                      : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1'
                      }`}
                  >
                    <div className="p-6">
                      <div className="relative">
                        {doctor.profileImage ? (
                          <img
                            src={doctor.profileImage}
                            alt={doctor.name}
                            className={`w-20 h-20 rounded-2xl object-cover border-2 transition-all ${isSelected
                              ? 'border-teal-300 shadow-md'
                              : 'border-slate-50'
                              }`}
                          />
                        ) : (
                          <div
                            className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${isSelected
                              ? 'border-teal-300 bg-teal-50 text-teal-700 shadow-md'
                              : 'border-slate-100 bg-slate-100 text-slate-500'
                              }`}
                          >
                            {doctor.name
                              .split(' ')
                              .map((n: any) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        )}

                        <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                          <div className="bg-teal-500 rounded-full p-1">
                            <BadgeCheck className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="mb-5">
                        <h3
                          className={`text-xl font-black transition-colors ${isSelected
                            ? 'text-teal-900'
                            : 'text-slate-900'
                            }`}
                        >
                          Dr. {doctor.name}
                        </h3>
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mt-1.5">
                          {t('verifiedSpecialist')}
                        </p>
                      </div>

                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                          </div>
                          <span className="text-xs font-bold truncate">
                            {doctor.qualification}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                            <Mail className="w-4 h-4 text-slate-400" />
                          </div>
                          <span className="text-xs font-bold truncate">
                            {doctor?.email}
                          </span>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-dashed border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                            {t('consultationFee')}
                          </p>
                          <p className={`text-xl font-black ${isSelected ? 'text-teal-700' : 'text-slate-900'}`}>
                            {/* {doctor.currency} {doctor.fee.toLocaleString()} */}
                            {doctor.currency}{' '}
                            {doctor.startingPrice === doctor.endingPrice
                              ? doctor.startingPrice?.toLocaleString()
                              : `${doctor.startingPrice?.toLocaleString()} – ${doctor.endingPrice?.toLocaleString()}`}
                          </p>
                        </div>

                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${isSelected
                            ? 'bg-teal-500 text-white shadow-teal-200'
                            : 'bg-slate-900 text-white group-hover:bg-teal-600 shadow-slate-200'
                            }`}
                        >
                          {isSaving && isSelected ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <ChevronRight
                              className={`w-6 h-6 transition-transform ${isSelected ? 'translate-x-1' : ''
                                }`}
                            />
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
