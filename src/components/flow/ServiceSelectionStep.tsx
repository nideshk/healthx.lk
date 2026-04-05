'use client';

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { ICON_MAP } from '@/lib/lucideIcons';
import { Stethoscope, CheckCircle2, ArrowRight, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { AppointmentFormInputs } from '@/types/FormType';
import Loader from '@/components/atom/Loader/Loader';
import { useTranslations, useLocale } from 'next-intl';

type Service = {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
  [key: string]: unknown;
};

interface Props {
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  draftData?: { data?: Partial<AppointmentFormInputs> };
  nextStep: (override?: any) => void;
  prevStep: () => void;
}

const ConsultationStep = forwardRef(
  ({ updateData, bookingData, draftData, nextStep, prevStep }: Props, ref) => {
    const t = useTranslations("serviceSelection");
    const locale = useLocale();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize from bookingData or draftData
    const [selectedServiceId, setSelectedServiceId] = useState<string | number | null>(
      bookingData?.selectedService?.id || (draftData?.data?.selectedService as any)?.id || null
    );

    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedServiceId) {
          toast.error(t("selectBeforeContinue"));
          return false;
        }
        return true;
      },
    }));

    useEffect(() => {
      const fetchServices = async () => {
        try {
          const res = await axios.get('/api/specialisation');
          setServices((res.data.services as Service[]) || []);
        } catch (err) {
          console.error('Failed to fetch services:', err);
          toast.error(t("failedToLoadServices"));
        } finally {
          setLoading(false);
        }
      };
      fetchServices();
    }, []);

    const handleSelectService = (service: Service) => {
      setSelectedServiceId(service.id);
      updateData({
        selectedService: service as AppointmentFormInputs['selectedService'],
        appointmentType: null,
        selectedAttendees: [],
        starts_at: null,
        ends_at: null,
      });
    };

    const handleNext = async () => {
      if (!selectedServiceId) {
        toast.error(t("selectServiceToProceed"));
        return;
      }
      setIsSubmitting(true);
      try {
        await nextStep();
      } finally {
        setIsSubmitting(false);
      }
    };

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Loader size="lg" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
            {t("preparingServices")}
          </p>
        </div>
      );
    }

    return (
      <div className="pb-32 pt-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-teal-100">
              {t("stepLabel")}
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              {t("title")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto font-medium">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const isSelected = selectedServiceId === service.id;
              const Icon = ICON_MAP[service.icon as string] || Stethoscope;

              return (
                <div
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className={`group relative rounded-[2rem] p-8 transition-all duration-300 cursor-pointer border-2 flex flex-col ${isSelected
                    ? 'bg-slate-900 border-slate-900 shadow-2xl shadow-slate-200 -translate-y-1'
                    : 'bg-white border-slate-100 hover:border-teal-200 hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-6 right-6 text-teal-400 animate-in zoom-in duration-300">
                      <CheckCircle2 className="w-6 h-6 fill-teal-400/10" />
                    </div>
                  )}

                  <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-6 transition-colors ${isSelected ? 'bg-slate-800 text-teal-400' : 'bg-slate-50 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600'
                    }`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className={`text-xl font-bold mb-3 tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {locale === 'si' && service.sin_slug ? (service.sin_slug as string) : service.name}
                  </h3>

                  <p className={`text-sm font-medium leading-relaxed mb-8 line-clamp-3 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    {locale === 'si' && service.sin_description
                      ? (service.sin_description as string)
                      : (service.description || t("defaultServiceDescription"))}
                  </p>

                  <div className="mt-auto flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-teal-400' : 'text-slate-300 group-hover:text-teal-600'}`}>
                      {isSelected ? t("currentSelection") : t("selectType")}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-teal-400 text-slate-900' : 'bg-slate-50 text-slate-400 group-hover:bg-teal-600 group-hover:text-white group-hover:rotate-[-45deg]'
                      }`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- FIXED NAVIGATION FOOTER --- */}
        <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 p-4 md:p-6 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                {t("currentProgress")}
              </p>
              <p className="text-sm font-bold text-slate-900">
                {selectedServiceId
                  ? (() => {
                    const sel = services.find(s => s.id === selectedServiceId);
                    if (!sel) return t("selectServicePrompt");
                    return locale === 'si' && sel.sin_slug ? (sel.sin_slug as string) : sel.name;
                  })()
                  : t("selectServicePrompt")}
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                type="button"
                onClick={prevStep}
                disabled={true}
                className="flex-1 md:flex-none px-6 py-3 rounded-2xl text-sm font-bold text-slate-400 border border-slate-100 disabled:opacity-30"
              >
                {t("back")}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedServiceId || isSubmitting}
                className="flex-[2] md:flex-none px-10 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 shadow-xl shadow-slate-200"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {t("continueToDoctors")}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ConsultationStep.displayName = 'ConsultationStep';
export default ConsultationStep;
