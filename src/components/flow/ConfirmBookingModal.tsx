'use client';
import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Modal from '../atom/Modal/Modal';
import {
  CheckCircle,
  Loader2,
  Wallet,
} from 'lucide-react';
import { AppointmentFormInputs } from '@/types/FormType';
import { formatLocalDateTime } from '@/lib/utils';

interface ConfirmBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: AppointmentFormInputs;
  resetFlow: () => void;
  updateData: any;
}

export default function ConfirmBookingModal({
  isOpen,
  onClose,
  bookingData,
  resetFlow,
}: ConfirmBookingModalProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');

  // 💰 Pricing
  const baseFee = (bookingData.selectedDoctor?.price || 0) + 950;
  const totalAmount = useMemo(() => baseFee, [baseFee]);

  // 🧩 Confirm booking — save to Supabase drafts table
  const handleConfirm = async () => {
  setLoading(true);
  try {
    // 🩺 Combine data
    const draftData = {
      ...bookingData,
      notes: notes || 'Created from MedX Portal',
      total_amount: totalAmount,
    };

    // 🧾 Save to Supabase (POST)
    const res = await axios.post("/api/appointment/draft", { data: draftData });
    const draft = res.data;

    console.log(draft)
    if (!draft?.data.id) throw new Error("No draft ID returned");

    console.log("✅ Draft saved to Supabase:", draft);

    // ➡️ Redirect to confirmation page
    router.push(`/appointment/confirmation`);
  } catch (err) {
    console.error("❌ Failed to save draft:", err);
  } finally {
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
                disabled
                  ? 'bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Draft...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Confirm & Continue
                </>
              )}
            </button>
          </>
        )
      }
    >

        <div className="space-y-5 text-sm text-gray-700">
          {/* Practitioner */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Practitioner
              </label>
              <input
                type="text"
                value={bookingData.selectedDoctor?.full_name || ''}
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
                value={bookingData.appointmentType?.name || ''}
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
                value={formatLocalDateTime(bookingData.starts_at || '')}
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
                value={formatLocalDateTime(bookingData.ends_at || '')}
                disabled
                className="w-full border rounded-md p-2 text-sm bg-gray-50 text-gray-700"
              />
            </div>
          </div>

          {/* 💰 Fee Summary */}
          <div className="mt-4 border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-600" /> Fee Summary
            </h4>
            <div className="text-xs text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Consultation Fee:</span>
                <span>{baseFee} LKR</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 border-t pt-2 mt-1">
                <span>Total payable:</span>
                <span>{totalAmount.toLocaleString()} LKR</span>
              </div>
            </div>
          </div>
        </div>
    </Modal>
  );
}
