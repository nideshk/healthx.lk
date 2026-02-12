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

        // First, try to use patientId if available, otherwise fetch by name
        if (patientId && patientId !== "") {
          const appointmentRes = await authFetch("/api/booking/appointment", {
            credentials: "include",
          });

          if (!appointmentRes.ok)
            throw new Error("Failed to fetch appointments");

          const appointmentResult = await appointmentRes.json();

          const allAppointments = Array.isArray(appointmentResult)
            ? appointmentResult
            : [
                ...(appointmentResult.ongoing || []),
                ...(appointmentResult.upcoming || []),
                ...(appointmentResult.past || []),
                ...(appointmentResult.cancelled || []),
              ];

          const patientAppointment = allAppointments.find(
            (appt: any) => appt.patient?.id === patientId,
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
            return;
          }
        }

        const appointmentRes = await authFetch("/api/booking/appointment", {
          credentials: "include",
        });

        if (!appointmentRes.ok) throw new Error("Failed to fetch appointments");

        const appointmentResult = await appointmentRes.json();

        const allAppointments = Array.isArray(appointmentResult)
          ? appointmentResult
          : [
              ...(appointmentResult.ongoing || []),
              ...(appointmentResult.upcoming || []),
              ...(appointmentResult.past || []),
              ...(appointmentResult.cancelled || []),
            ];

        const patientAppointment = allAppointments.find(
          (appt: any) => appt.patient?.full_name === patientName,
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

    if (patientName || patientId) {
      fetchFullPatientData();
    }
  }, [patientName, patientId]);

  useEffect(() => {
    if (!patientData?.id) return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const res = await authFetch("/api/booking/appointment", {
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch appointments");
        }

        const data = await res.json();

        const allAppointments = Array.isArray(data)
          ? data
          : [
              ...(data.ongoing || []),
              ...(data.upcoming || []),
              ...(data.past || []),
              ...(data.cancelled || []),
            ];

        const patientAppointments = allAppointments.filter(
          (appt: any) => appt.patient?.id === patientData.id,
        );

        const formatDateFromISO = (isoString: string): string => {
          try {
            const date = new Date(isoString);
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          } catch {
            return "-";
          }
        };

        const formatTimeFromISO = (isoString: string): string => {
          try {
            const date = new Date(isoString);
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            if (hours === 0) hours = 12;
            const hoursStr = String(hours).padStart(2, "0");
            return `${hoursStr}:${minutes} ${ampm}`;
          } catch {
            return "-";
          }
        };

        const mapped: any[] = patientAppointments.map((a: any) => {
          let category: "upcoming" | "ongoing" | "previous" = "previous";

          if (data.ongoing?.some((appt: any) => appt.id === a.id)) {
            category = "ongoing";
          } else if (data.upcoming?.some((appt: any) => appt.id === a.id)) {
            category = "upcoming";
          } else {
            category = "previous";
          }

          const formattedDate = formatDateFromISO(a.starts_at);
          const formattedTime = formatTimeFromISO(a.starts_at);

          return {
            id: a.id,
            date: formattedDate,
            time: formattedTime,
            info: `${formattedDate} at ${formattedTime}`,
            doctorName: "Dr. " + (a.practitioner?.name || "Unknown"),
            // FIX: Ensure appointmentType and reason are correctly mapped from API fields
            appointmentType: a.appointment_type?.name || "Standard Consultation",
            category,
            reason: a.appointment_type?.name || a.notes || "No reason provided",
            status: a.status || "confirmed",
            clinicianNotes: a.notes || "",
            prescriptions: "",
            room_key: a.room_key || "",
            email: a.patient?.email || "",
            contact_number: a.patient?.contact_number || "",
          };
        });

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