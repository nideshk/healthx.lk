'use client';
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { AppointmentFormInputs } from './AppointmentBookingFlow';
import Modal from '../atom/Modal/Modal';
import { Upload, CheckCircle, Loader2, Users, User, Wallet } from 'lucide-react';

interface ConfirmBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: AppointmentFormInputs;
  resetFlow: () => void;
}

interface Patient {
  patient_id: string;
  supabase_id: string;
  name: string;
}

export default function ConfirmBookingModal({
  isOpen,
  onClose,
  bookingData,
  resetFlow,
}: ConfirmBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // --- Attendee Management ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<Patient[]>([]);
  const [isGroupAppointment, setIsGroupAppointment] = useState(
    bookingData.attendeeCount > 1
  );

  // Mock data (replace with Supabase or API fetch later)
  const allPatients: Patient[] = [
    { patient_id: '1234566', supabase_id: '439085340963', name: 'Anirudh Kulkarni' },
    { patient_id: '9875632', supabase_id: '4909025253', name: 'Nidesh' },
  ];

  // 🔍 Filter logic for patient search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = allPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.patient_id.includes(q) ||
        p.supabase_id.includes(q)
    );
    setFilteredPatients(matches);
  }, [searchQuery]);

  const handleAddAttendee = (patient: Patient) => {
    const alreadyAdded = selectedAttendees.some(
      (a) => a.patient_id === patient.patient_id
    );
    if (!alreadyAdded) {
      setSelectedAttendees((prev) => [...prev, patient]);
      setSearchQuery('');
      setFilteredPatients([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  // 💰 Dynamic pricing logic
  const baseFee = bookingData.selectedDoctor?.fee || 0;
  const additionalFee = 500;
  const totalAmount = useMemo(() => {
    if (isGroupAppointment) {
      const extra = selectedAttendees.length * additionalFee;
      return baseFee + extra;
    }
    return baseFee;
  }, [isGroupAppointment, selectedAttendees, baseFee]);

  const handleConfirm = async () => {
  setLoading(true);

  try {
    // 1️⃣ Fetch Practitioner Info
    const { data: practitioner } = await axios.get(
      `/api/practitioner/${bookingData.selectedDoctor!.registration}`
    );

    // 2️⃣ Calculate Start & End Times
    const start = new Date(bookingData.appointmentDate!);
    const [hours, minutes] = bookingData.appointmentTimeSlot!.split(':').map(Number);
    start.setHours(hours, minutes);
    const end = new Date(start.getTime() + 30 * 60000);

    // 3️⃣ Upload File if Provided
    let attachmentUrl: string | null = null;
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await axios.post("/api/attachment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      attachmentUrl = uploadRes.data?.url || null;
    }

    // 4️⃣ Build Appointment Payload
    const payload = {
      appointment_type_id: bookingData.selectedServiceId,
      practitioner_id: bookingData.selectedDoctor!.registration,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      notes: notes || "Created from MedX Portal",
      patient_case_id: null,
      repeat_rule: null,
      patient_id: bookingData.initialPatientId,
      attachment: attachmentUrl,
      total_amount: totalAmount,
    };

    console.log("✅ Final Payload Sent:", payload);

    // 5️⃣ Send to Backend
    await axios.post("/api/appointment", payload);

    // ✅ Success UX
    setSuccess(true);
    setTimeout(() => {
      setLoading(false);
      onClose();
      resetFlow();
    }, 1500);
  } catch (err) {
    console.error("❌ Booking failed:", err);
    setLoading(false);
  }
};


  const disabled = loading || success;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review & Confirm Appointment"
      theme="light"
      footer={
        success ? null : (
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100"
              disabled={disabled}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={disabled}
              className={`px-4 py-2 rounded-md text-white font-semibold flex items-center gap-2 ${
                disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Confirm & Pay
                </>
              )}
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="p-6 text-center text-green-600 font-semibold">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
          Appointment successfully booked and payment confirmed!
        </div>
      ) : (
        <div className="space-y-5 text-sm text-gray-700">
          {/* Practitioner Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Practitioner
              </label>
              <input
                type="text"
                value={bookingData.selectedDoctor?.name || ''}
                disabled
                className="w-full border rounded-md p-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Appointment Type
              </label>
              <input
                type="text"
                value={bookingData.selectedServiceTitle}
                disabled
                className="w-full border rounded-md p-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={`${bookingData.appointmentDate?.toLocaleDateString()} ${bookingData.appointmentTimeSlot}`}
                disabled
                className="w-full border rounded-md p-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                End Time
              </label>
              <input
                type="text"
                value="(auto +30 min)"
                disabled
                className="w-full border rounded-md p-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* 🔄 Switch Single / Group */}
          <div className="flex items-center justify-between border-t pt-3 mt-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              {isGroupAppointment ? (
                <>
                  <Users className="w-4 h-4 text-blue-600" /> Group Appointment
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-blue-600" /> Single Appointment
                </>
              )}
            </span>
            <button
              onClick={() => {
                setIsGroupAppointment((prev) => !prev);
                setSelectedAttendees([]);
              }}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Switch to {isGroupAppointment ? 'Single' : 'Group'}
            </button>
          </div>

          {/* 👥 Attendee Section */}
          {isGroupAppointment && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 mt-2">
                Add Family Members Attending
              </label>

              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search by name or patient ID..."
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="absolute mt-1 w-full bg-white border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <button
                          key={p.patient_id}
                          onClick={() => handleAddAttendee(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                        >
                          <span className="font-medium text-gray-800">{p.name}</span>
                          <span className="block text-xs text-gray-500">
                            ID: {p.patient_id}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-red-500">
                        ❌ No matching patient found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedAttendees.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedAttendees.map((attendee) => (
                    <div
                      key={attendee.patient_id}
                      className="flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full"
                    >
                      <span>{attendee.name}</span>
                      <button
                        onClick={() =>
                          setSelectedAttendees((prev) =>
                            prev.filter((a) => a.patient_id !== attendee.patient_id)
                          )
                        }
                        className="text-blue-700 hover:text-blue-900"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  No attendees added yet. Search above to add.
                </p>
              )}
            </div>
          )}

          {/* 💰 Price Summary */}
          <div className="mt-4 border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" /> Fee Summary
            </h4>
            <div className="text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Base consultation fee:</span>
                <span>{baseFee} LKR</span>
              </div>
              {isGroupAppointment && (
                <div className="flex justify-between">
                  <span>Additional members ({selectedAttendees.length} × 500 LKR):</span>
                  <span>{selectedAttendees.length * additionalFee} LKR</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 border-t pt-2 mt-1">
                <span>Total payable:</span>
                <span>{totalAmount.toLocaleString()} LKR</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 mt-3">
              Notes
            </label>
            <textarea
              placeholder="Add any appointment notes..."
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Attachment (optional)
            </label>
            <label className="flex items-center gap-2 border p-2 rounded-md cursor-pointer hover:bg-blue-50">
              <Upload className="w-4 h-4 text-blue-500" />
              <input type="file" className="hidden" onChange={handleFileChange} />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Upload file (PDF, image, etc.)'}
              </span>
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
