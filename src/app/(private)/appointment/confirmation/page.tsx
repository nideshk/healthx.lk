'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, Upload } from 'lucide-react';

export default function AppointmentConfirmPage() {
  const router = useRouter();

  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // STEP 1
  const [telehealthConsent, setTelehealthConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);

  // STEP 2
  const [consultationDetails, setConsultationDetails] = useState({
    concern: '',
    goal: '',
    referral: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // STEP 3
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [draftId, setDraftId] = useState("");

  // 🧭 Fetch Draft
  useEffect(() => {
    (async () => {
      try {
        const resp = await axios.get(`/api/appointment/draft`);
        setDraft(resp.data.drafts);
        setDraftId(resp.data.drafts?.[0]?.id);
      } catch (err) {
        console.error('❌ Failed to fetch draft:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===== VALIDATION RULES =====
  const canGoForward = () => {
    if (step === 1) return telehealthConsent && termsConsent;
    if (step === 2)
      return consultationDetails.concern.trim() && consultationDetails.referral.trim();
    if (step === 3) return !paymentLoading && !paymentDone;
    return false;
  };

  // ===== FILE HANDLERS =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected.slice(0, 3)); // max 3
  };

  const handleUploadDocs = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await axios.post('/api/attachment', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrls.push(uploadRes.data.url);
      }
      await axios.patch('/api/appointment/draft', {
        id: draftId,
        updates: { attachments: uploadedUrls },
      });
    } catch (err) {
      console.error('❌ Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // ===== STEP HANDLERS =====
  const handleNext = async () => {
    if (!canGoForward()) return;

    if (step === 1) {
      await axios.patch('/api/appointment/draft', {
        id: draftId,
        updates: { consent: { telehealth: true, terms: true } },
      });
      setStep(2);
    } else if (step === 2) {
      await handleUploadDocs();
      await axios.patch('/api/appointment/draft', {
        id: draftId,
        updates: { pre_consultation: consultationDetails },
      });
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      // Simulate payment or call your real payment API here
      await new Promise((res) => setTimeout(res, 2000));

      const formData = draft[0].data;
      const payload = {
        appointment_type_id: formData.appointmentType.id,
        business_id: "1725382642183972780",
        practitioner_id: formData.selectedDoctor.cliniko_practitioner_id,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at,
        notes: formData?.pre_consultation?.concern || "Created from Medx Portal",
      };

      await axios.post('/api/appointment', payload);
      setPaymentDone(true);
      setTimeout(() => router.push('/appointment/success'), 1500);
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ===== RENDERING =====
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );

  const booking = draft?.[0]?.data;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-2 text-gray-800">
        {step === 1 && 'Consent & Terms'}
        {step === 2 && 'Pre-Consultation Information'}
        {step === 3 && 'Payment'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {step === 1 && 'Please review and accept to proceed with your appointment.'}
        {step === 2 && 'Provide some pre-consultation details for your doctor.'}
        {step === 3 && 'Complete your payment to confirm your appointment.'}
      </p>

      {/* STEP 1 — CONSENT */}
      {step === 1 && (
        <div className="space-y-6 bg-white border p-6 rounded-lg shadow-sm">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">🩺 Telehealth Consent</h3>
            <div className="p-3 border rounded-md text-sm text-gray-600 h-32 overflow-y-auto bg-gray-50">
              By agreeing to this telehealth consent, you acknowledge and agree to
              the use of electronic communications to consult, treat, and educate.
            </div>
            <label className="flex items-center mt-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={telehealthConsent}
                onChange={(e) => setTelehealthConsent(e.target.checked)}
                className="mr-2"
              />
              I Accept the Telehealth Consent
            </label>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-2">📄 Terms and Conditions</h3>
            <div className="p-3 border rounded-md text-sm text-gray-600 h-32 overflow-y-auto bg-gray-50">
              Appointments must be cancelled at least 24 hours in advance. No-show
              appointments may incur fees. Payment is due at time of service.
            </div>
            <label className="flex items-center mt-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={termsConsent}
                onChange={(e) => setTermsConsent(e.target.checked)}
                className="mr-2"
              />
              I Agree to the Terms and Conditions
            </label>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 border rounded-md"
            >
              I Do Not Agree
            </button>
            <button
              disabled={!canGoForward()}
              onClick={handleNext}
              className={`px-5 py-2 rounded-md text-white ${
                canGoForward()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — PRE CONSULTATION */}
      {step === 2 && (
        <div className="space-y-4 bg-white shadow p-6 rounded-lg border">
          <h3 className="font-semibold text-gray-800 text-lg mb-4">
            Consultation Details
          </h3>

          {/* Concern */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              What is your main concern today? *
            </label>
            <textarea
              rows={2}
              className="w-full border rounded-md p-2 mt-1 text-sm"
              value={consultationDetails.concern}
              onChange={(e) =>
                setConsultationDetails({
                  ...consultationDetails,
                  concern: e.target.value,
                })
              }
            />
          </div>

          {/* Goal */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              What are you hoping to achieve from this consultation?
            </label>
            <textarea
              rows={2}
              className="w-full border rounded-md p-2 mt-1 text-sm"
              value={consultationDetails.goal}
              onChange={(e) =>
                setConsultationDetails({
                  ...consultationDetails,
                  goal: e.target.value,
                })
              }
            />
          </div>

          {/* Referral */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              How did you hear about this platform? *
            </label>
            <select
              className="w-full border rounded-md p-2 mt-1 text-sm"
              value={consultationDetails.referral}
              onChange={(e) =>
                setConsultationDetails({
                  ...consultationDetails,
                  referral: e.target.value,
                })
              }
            >
              <option value="">Please select an option</option>
              <option value="Friend">Friend</option>
              <option value="Social Media">Social Media</option>
              <option value="Search Engine">Search Engine</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Upload for the Doctor (Max 3)
            </label>
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:bg-gray-50">
              <Upload className="w-5 h-5 text-blue-600 mr-2" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-sm text-gray-600">
                Click to upload documents
              </span>
            </label>
            {files.length > 0 && (
              <ul className="mt-2 text-xs text-gray-500">
                {files.map((f) => (
                  <li key={f.name}>📄 {f.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 border rounded-md"
            >
              Back
            </button>
            <button
              disabled={!canGoForward()}
              onClick={handleNext}
              className={`px-5 py-2 rounded-md text-white ${
                canGoForward()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {uploading ? 'Uploading...' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — PAYMENT */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="bg-white p-5 shadow rounded-lg border">
            <h3 className="font-semibold text-gray-800 text-lg mb-3">
              Appointment Summary
            </h3>
            <p><strong>Service:</strong> {booking.selectedServiceTitle}</p>
            <p><strong>Doctor:</strong> {booking.selectedDoctor?.full_name}</p>
            <p><strong>Date:</strong> {new Date(booking.starts_at).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {new Date(booking.starts_at).toLocaleTimeString()}</p>
            <p><strong>Total Fee:</strong> LKR {booking.total_amount}</p>
          </div>

          {/* Payment */}
          <div className="bg-white p-5 shadow rounded-lg border text-center">
            <h3 className="font-semibold text-gray-800 text-lg mb-3">
              Payment Details
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Your payment is secure and encrypted.
            </p>

            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="px-5 py-2 bg-green-600 text-white rounded-md flex items-center justify-center gap-2 w-full"
            >
              {paymentLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Pay LKR {booking.total_amount} Securely
            </button>

            {paymentDone && (
              <p className="mt-3 text-green-600 flex justify-center items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Payment Successful!
              </p>
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-600 border rounded-md"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
