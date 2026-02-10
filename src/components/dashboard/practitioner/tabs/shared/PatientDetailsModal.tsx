"use client";

import React, { useEffect, useState } from "react";
import { Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import PatientDetailView from "../seachPatients/PatientDetailView";
import Loader from "@/components/atom/Loader/Loader";
import Button from "@/components/atom/Button/Button";

// Admin-only lean appointment type
export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  info: string;
  doctorName: string;
  appointmentType: string;
  category: "upcoming" | "ongoing" | "previous";
}

interface PatientDetailsModalProps {
  patientId: string;
  patientName: string;
  onClose: () => void;
}

const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  patientId,
  patientName,
  onClose,
}) => {
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    const fetchFullPatientData = async () => {
      try {
        setLoading(true);
        // Fetch all appointments to extract patient data (same approach as SearchPatientsTab)
        const appointmentRes = await authFetch("/api/booking/appointment", {
          credentials: "include",
        });

        if (!appointmentRes.ok) throw new Error("Failed to fetch appointments");

        const appointmentResult = await appointmentRes.json();
        
        // Merge all appointment categories
        const allAppointments = Array.isArray(appointmentResult)
          ? appointmentResult
          : [
              ...(appointmentResult.ongoing || []),
              ...(appointmentResult.upcoming || []),
              ...(appointmentResult.past || []),
              ...(appointmentResult.cancelled || []),
            ];

        // Find the patient by name from their appointments
        const patientAppointment = allAppointments.find(
          (appt: any) => appt.patient?.full_name === patientName
        );

        if (patientAppointment?.patient) {
          const p = patientAppointment.patient;
          const foundPatient: Patient = {
            id: p.id,
            patientId: p.id,
            full_name: p.full_name || `${p.first_name} ${p.last_name}`,
            email: p.email,
            contact_number: p.contact_number || p.phone,
            age: p.age ?? 0,
            gender: p.gender ?? "",
            dob: p.dob ?? "",
            allergies: Array.isArray(p.allergies)
              ? p.allergies.join(", ")
              : p.allergies || "",
            lastConsultation: "",
            consentGiven: false,
            addressLine1: p.address,
            city: p.city,
            country: p.country,
          };
          setPatientData(foundPatient);
        } else {
          console.error("Patient not found in appointments");
        }
      } catch (err) {
        console.error("Error loading patient details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (patientName) {
      fetchFullPatientData();
    }
  }, [patientName]);

  // Step 2: Fetch Appointments ONLY after we have confirmed patientData and a valid ID
  useEffect(() => {
    if (!patientData?.id) return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const res = await authFetch(
          `/api/patient/${patientData.id}/appointments`,
          { credentials: "include" },
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch appointments");
        }

        const data = await res.json();

        // Robust Mapping including Ongoing and Appointment Types
        const mapped: any[] = [
          ...(data.scheduled ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "upcoming" as const,
            reason: a.reason || "-",
            status: "confirmed" as const,
          })),
          ...(data.ongoing ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "ongoing" as const,
            reason: a.reason || "-",
            status: "confirmed" as const,
          })),
          ...(data.completed ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "previous" as const,
            reason: a.reason || "-",
            status: "completed" as const,
          })),
        ];

        setAppointments(mapped);
      } catch (err) {
        console.error("Error fetching appointments:", err);
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [patientData]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl z-10"
        >
          ×
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader />
            <p className="text-xs text-slate-500 mt-4">
              Loading patient records...
            </p>
          </div>
        ) : patientData ? (
          <PatientDetailView
            patient={patientData}
            appointments={appointments}
            onBack={onClose}
          />
        ) : (
          <div className="text-center py-10 flex flex-col items-center justify-center">
            <div className="text-slate-400 mb-2 text-4xl">⚠️</div>
            <p className="text-slate-500 font-medium">
              Patient information not found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Verify if the patient ID exists in the system.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetailsModal;
