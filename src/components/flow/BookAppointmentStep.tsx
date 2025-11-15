'use client';
import React, {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ChevronLeft, Clock, Mail, Phone } from 'lucide-react';
import Calendar from '../atom/Calendar/Calendar';
import { AppointmentFormInputs } from '@/types/FormType';

interface BookAppointmentStepProps {
  nextStep: () => void;
  prevStep: () => void;
  updateData: (data: Partial<AppointmentFormInputs>) => void;
  bookingData: AppointmentFormInputs;
  draftData?: any;
}

const BookAppointmentStep = forwardRef(
  (
    { nextStep, prevStep, updateData, bookingData, draftData }: BookAppointmentStepProps,
    ref
  ) => {
    // 🧠 Normalize and merge draft data
    const normalizedDraft = useMemo(() => {
      if (!draftData) return null;
      const startDate = draftData.starts_at ? new Date(draftData.starts_at) : null;
      const dateStr = startDate
        ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(startDate.getDate()).padStart(2, '0')}`
        : null;
      const timeStr = startDate
        ? startDate.toISOString().split('T')[1].slice(0, 5)
        : null;
      return {
        date: dateStr,
        time: timeStr,
        appointmentType: draftData.appointmentType || null,
        practitioner: draftData.selectedDoctor || draftData.practitioner_id || null,
      };
    }, [draftData]);

    const { selectedDoctor } = bookingData;

    const [loading, setLoading] = useState(true);
    const [practitionerData, setPractitionerData] = useState<any>(null);
    const [bookedSlots, setBookedSlots] = useState<Record<string, any[]>>({});
    const [selectedDate, setSelectedDate] = useState<string | null>(
      bookingData.starts_at
        ? `${new Date(bookingData.starts_at).getFullYear()}-${String(
            new Date(bookingData.starts_at).getMonth() + 1
          ).padStart(2, '0')}-${String(
            new Date(bookingData.starts_at).getDate()
          ).padStart(2, '0')}`
        : normalizedDraft?.date || null
    );
    const [selectedTime, setSelectedTime] = useState<string | null>(
      bookingData.starts_at
        ? new Date(bookingData.starts_at).toISOString().split('T')[1].slice(0, 5)
        : normalizedDraft?.time || null
    );
    const [selectedAppointmentType, setSelectedAppointmentType] = useState<any>(
      bookingData.appointmentType || normalizedDraft?.appointmentType || null
    );
    const [missingFields, setMissingFields] = useState<string[]>([]);

    // ✅ Fetch practitioner info
    useEffect(() => {
      const fetchPractitioner = async () => {
        if (!selectedDoctor?.id && !selectedDoctor?.registration) return;
        setLoading(true);
        try {
          const res = await axios.get(
            `/api/practitioners/${selectedDoctor.id || selectedDoctor.registration}`
          );
          setPractitionerData(res.data.practitioner);
        } catch (err) {
          console.error('❌ Error fetching practitioner data:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchPractitioner();
    }, [selectedDoctor]);

    // ✅ Fetch booked slots per selected date
    useEffect(() => {
      const fetchBookedSlots = async () => {
        if (!selectedDate || !practitionerData?.cliniko_practitioner_id) return;
        try {
          const res = await axios.get(
            `/api/practitioners/${practitionerData.cliniko_practitioner_id}/booked?from=${selectedDate}&to=${selectedDate}`
          );
          setBookedSlots(res.data.grouped || res.data.data?.grouped || {});
        } catch (err) {
          console.error('⚠️ Failed to fetch booked slots:', err);
        }
      };
      fetchBookedSlots();
    }, [selectedDate, practitionerData]);

    // ✅ Generate available time slots
    const generatedTimeSlots = useMemo(() => {
      if (!selectedAppointmentType?.duration) return [];
      const slots: string[] = [];
      const start = new Date();
      start.setHours(9, 0, 0, 0);
      const end = new Date();
      end.setHours(18, 0, 0, 0);
      const duration = selectedAppointmentType.duration;
      const current = new Date(start);

      while (current < end) {
        const hours = current.getHours().toString().padStart(2, '0');
        const minutes = current.getMinutes().toString().padStart(2, '0');
        slots.push(`${hours}:${minutes}`);
        current.setMinutes(current.getMinutes() + duration);
      }
      return slots;
    }, [selectedAppointmentType]);

    // ✅ Parse and check booked slots
    const parseTime = (t: string) => {
      if (!t) return [0, 0];
      if (t.includes('T')) {
        const date = new Date(t);
        return [date.getUTCHours(), date.getUTCMinutes()];
      }
      const clean = t.replace(/[^\d:]/g, '');
      return clean.split(':').map(Number);
    };

    const isSlotBooked = (time: string): boolean => {
      if (!selectedDate || !bookedSlots[selectedDate]) return false;

      const [slotH, slotM] = time.split(':').map(Number);
      const slotStart = slotH * 60 + slotM;
      const slotEnd = slotStart + (selectedAppointmentType?.duration || 0);

      return bookedSlots[selectedDate].some((b: any) => {
        const [fromH, fromM] = parseTime(b.from);
        const [toH, toM] = parseTime(b.to);
        const bookedStart = fromH * 60 + fromM;
        const bookedEnd = toH * 60 + toM;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    };

    // ✅ Step validation
    useImperativeHandle(ref, () => ({
      validateStep: () => {
        const missing: string[] = [];
        if (!selectedAppointmentType) missing.push('appointmentType');
        if (!selectedDate) missing.push('date');
        if (!selectedTime) missing.push('time');
        setMissingFields(missing);

        if (missing.length > 0) {
          if (missing.includes('appointmentType'))
            toast.error('Please select an appointment type.');
          else if (missing.includes('date')) toast.error('Please select a date.');
          else if (missing.includes('time')) toast.error('Please select a time slot.');
          return false;
        }
        return true;
      },
    }));

    if (loading)
      return (
        <div className="flex justify-center items-center min-h-screen text-gray-600">
          Loading practitioner details...
        </div>
      );

    if (!practitionerData)
      return (
        <p className="text-center text-red-500 mt-10">
          No practitioner data available.
        </p>
      );

    const practitioner = practitionerData;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 font-sans py-10">
        <div className="max-w-6xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={prevStep}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center mb-6"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>

          <h1 className="text-3xl font-extrabold text-gray-900">Book Appointment</h1>
          <p className="text-gray-500 mt-1 text-base">
            Schedule your session with{' '}
            <span className="text-blue-600 font-semibold">{practitioner.full_name}</span>.
          </p>

          <div className="grid md:grid-cols-2 gap-10 mt-10">
            {/* LEFT — Doctor Info */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <img
                  src={practitioner.profile_image || '/images/default-doctor.png'}
                  alt={practitioner.full_name}
                  className="w-20 h-20 rounded-full object-cover border border-gray-200"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {practitioner.full_name}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {practitioner.qualifications}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Reg: {practitioner.license_number || selectedDoctor?.registration}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600 space-y-1">
                {practitioner.contact_email && (
                  <p className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-600" /> {practitioner.contact_email}
                  </p>
                )}
                {practitioner.contact_number && (
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-blue-600" /> {practitioner.contact_number}
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT — Booking */}
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
              {/* Appointment Type */}
              <h4
                className={`font-semibold mb-2 ${
                  missingFields.includes('appointmentType')
                    ? 'text-red-600'
                    : 'text-gray-800'
                }`}
              >
                Select Appointment Type
              </h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {practitioner.appointment_type?.map((type: any) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedAppointmentType(type);
                      updateData({ appointmentType: type });
                      setSelectedTime(null);
                    }}
                    className={`px-3 py-1.5 rounded-md border text-sm transition ${
                      selectedAppointmentType?.id === type.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    {type.name} ({type.duration} min)
                  </button>
                ))}
              </div>

              {/* Calendar */}
              <h4
                className={`font-semibold mb-2 ${
                  missingFields.includes('date') ? 'text-red-600' : 'text-gray-800'
                }`}
              >
                Select Date
              </h4>
              <Calendar
                value={selectedDate ? new Date(selectedDate) : undefined}
                onChange={(date) => {
                  if (!date) return;
                  const dateStr = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  setSelectedDate(dateStr);
                  setSelectedTime(null);
                }}
                availableDates={[]}
                minDate={new Date()}
                theme="light"
              />

              {/* Time Slots */}
              {selectedDate && selectedAppointmentType && (
                <div className="mt-6">
                  <h4
                    className={`font-semibold mb-2 flex items-center gap-1 ${
                      missingFields.includes('time')
                        ? 'text-red-600'
                        : 'text-gray-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-blue-600" /> Available Slots (
                    {selectedAppointmentType.duration} min)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {generatedTimeSlots.map((time) => {
                      const booked = isSlotBooked(time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          onClick={() => {
                            if (booked) return;
                            setSelectedTime(time);

                            const [hours, minutes] = time.split(':').map(Number);
                            const [year, month, day] = selectedDate!
                              .split('-')
                              .map(Number);

                            // ✅ Now convert to UTC only here for backend-safe storage
                            const start = new Date(
                              Date.UTC(year, month - 1, day, hours, minutes, 0)
                            );
                            const end = new Date(
                              Date.UTC(
                                year,
                                month - 1,
                                day,
                                hours,
                                minutes + selectedAppointmentType.duration,
                                0
                              )
                            );

                            updateData({
                              starts_at: start.toISOString(),
                              ends_at: end.toISOString(),
                            });
                          }}
                          disabled={booked}
                          className={`px-3 py-1.5 rounded-md border text-sm transition ${
                            booked
                              ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

BookAppointmentStep.displayName = 'BookAppointmentStep';
export default BookAppointmentStep;
