'use client';
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner'; // optional: use toast for feedback

// ✅ ForwardRef so parent can access validateStep()
const ConsultationStep = forwardRef(
  (
    {
      updateData,
      draftData,
    }: {
      updateData: any;
      bookingData: any;
      draftData: any;
    },
    ref
  ) => {
    console.log("draftData", draftData?.data);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<any>(
      draftData?.data?.selectedService?.id || null
    );

    // ✅ Expose validateStep() to parent (AppointmentBookingFlow)
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        if (!selectedService) {
          toast.error('Please select a consultation type before continuing.');
          return false;
        }
        return true;
      },
    }));

    useEffect(() => {
      const fetchServices = async () => {
        try {
          const res = await axios.get('/api/specialisation');
          setServices(res.data.services || []);
        } catch (err) {
          console.error('Failed to fetch services:', err);
          toast.error('Failed to load services. Please try again later.');
        } finally {
          setLoading(false);
        }
      };
      fetchServices();
    }, []);

    const handleSelectService = (service: any) => {
      setSelectedService(service.id);
      updateData({
        selectedService : service,
      });
    };

    if (loading)
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">Loading services...</p>
        </div>
      );

    return (
      <div className="bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Select a Consultation Type
          </h2>
          <p className="text-center text-gray-500 mb-12">
            Connect with licensed practitioners for personalized care and
            treatment options.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const isSelected = selectedService === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className={`group relative rounded-3xl p-8 shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center text-center border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-[1.02]'
                      : 'bg-white border-gray-200 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 flex items-center justify-center rounded-full mb-5 ${
                      isSelected
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    <span className="text-2xl">{service.icon || '💊'}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-xl font-semibold uppercase mb-2 ${
                      isSelected ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {service.name}
                  </h3>

                  {/* Description */}
                  <p
                    className={`text-sm mb-6 line-clamp-3 ${
                      isSelected ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {service.description ||
                      'Connect with licensed physicians for personalized care.'}
                  </p>

                  {/* CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectService(service);
                    }}
                    className={`mt-auto inline-flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-white text-blue-700 hover:bg-blue-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSelected ? 'Selected ✓' : 'Select Service'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

// Required for forwardRef
ConsultationStep.displayName = 'ConsultationStep';
export default ConsultationStep;
