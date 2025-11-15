"use client";
import React from "react";
import { CheckCircle } from "lucide-react";
import { redirect, useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

export default async function AppointmentSuccessPage({searchParams} : {searchParams :any}) {
  const router = useRouter();

  const userRes = await supabaseClient.auth.getUser();

  const appointmentId = searchParams?.appointment_id;
  if (!appointmentId) redirect("/"); // 🚫 no appointment — go home

  const { data: appointment } = await supabaseClient
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  // ✅ check if valid and belongs to logged-in user
  if (!appointment || appointment.patient_id !== userRes.data.user?.id) {
    redirect("/");
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* ✅ Success Banner */}
      <div className="max-w-3xl w-full bg-white shadow-md rounded-2xl overflow-hidden border border-green-200">
        <div className="bg-green-600 text-white py-5 px-6 flex flex-col items-center text-center">
          <CheckCircle className="w-10 h-10 text-white mb-2" />
          <h1 className="text-2xl font-bold">Payment Made, Appointment Confirmed!</h1>
          <p className="text-green-100 mt-1">Congratulations</p>
        </div>

        {/* 💡 Preparation Info */}
        <div className="p-6 space-y-4 text-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <span>📅</span> How to Prepare for Your Telehealth Appointment
          </h2>

          {/* Email Confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-blue-700 font-semibold mb-1">📧 Email Confirmation</h3>
            <p className="text-sm">
              You will receive an email to your registered email address with the appointment link.{" "}
              <strong>Please check your SPAM folder</strong> if you don’t see this email in your inbox.
            </p>
          </div>

          {/* Appointment Day */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-green-700 font-semibold mb-1">🕐 On Appointment Day</h3>
            <p className="text-sm">
              Click on the link provided in your email to join the appointment. Your doctor will join you on
              time. Please ensure you have a stable internet connection and are in a quiet environment.
            </p>
          </div>

          {/* Additional Members */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h3 className="text-purple-700 font-semibold mb-1">👥 Additional Members</h3>
            <p className="text-sm">
              If you selected additional members for this appointment, please forward the appointment link to
              them so they can join the consultation as well.
            </p>
          </div>

          {/* Follow-up Call */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="text-orange-700 font-semibold mb-1">📞 Follow-up Call</h3>
            <p className="text-sm">
              After your consultation, we may reach out for feedback to help us improve our services. Your
              feedback is valuable to us.
            </p>
          </div>

          {/* Footer */}
          <p className="text-sm text-gray-600 border-t pt-3">
            Thank you for choosing our telehealth services. We look forward to providing you with excellent
            care.
          </p>

          {/* Return Button */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
