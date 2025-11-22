import React from 'react';
import { Stethoscope } from 'lucide-react';
import { canJoinSession } from '@/utils/time';

type Appointment = {
  id: string;
  starts_at: string;
  status: string;
  appointment_type?: { name?: string; duration_mins?: number };
  practitioner?: { full_name?: string; specialization?: string[] };
};

export default function NextAppointmentCard({ appt }: { appt: Appointment }) {
  const start = new Date(appt.starts_at);
  const doctor = appt.practitioner || {};

  const joinEnabled = canJoinSession(appt.starts_at);

  return (
    <div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-blue-700" />
        </div>

        <div>
          <p className="font-semibold text-gray-900 text-sm">{doctor.full_name}</p>
          <p className="text-xs text-gray-600">{doctor.specialization?.join(', ')}</p>

          <p className="text-xs text-gray-500 mt-1">
            <strong>{start.toLocaleDateString()}</strong> •{' '}
            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          disabled={!joinEnabled}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer
            ${joinEnabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
        >
          Join
        </button>

        <button className="py-2 px-3 text-xs bg-white border hover:bg-black hover:text-white ease-in-out cursor-pointer rounded-lg">
          Reschedule
        </button>
      </div>
    </div>
  );
}
