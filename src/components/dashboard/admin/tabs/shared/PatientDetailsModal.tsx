"use client";

import React, { useEffect, useState } from "react";
import { Patient } from "@/types/Dashboard";
import { authFetch } from "@/lib/authFetch";
import PatientDetails, {
  AdminAppointment,
} from "../searchPatient/PatientDetails";
import Loader from "@/components/atom/Loader/Loader";
import Button from "@/components/atom/Button/Button";

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
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    const fetchFullPatientData = async () => {
      try {
        setLoading(true);
        // Step 1: Fetch Patient Basic Info using the search query with patient name
        const patientRes = await authFetch(
          `/api/patient?q=${encodeURIComponent(patientId)}`,
          {
            credentials: "include",
          },
        );

        if (!patientRes.ok) throw new Error("Failed to fetch patient list");

        const patientResult = await patientRes.json();
        // Get the first patient from the array (or find by ID if available)
        const foundPatient = Array.isArray(patientResult.data)
          ? patientResult.data[0]
          : patientResult.data;

        if (foundPatient) {
          setPatientData(foundPatient);
        } else {
          console.error("Patient not found in search results");
        }
      } catch (err) {
        console.error("Error loading patient details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchFullPatientData();
    }
  }, [patientId]);

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
        const mapped: AdminAppointment[] = [
          ...(data.scheduled ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "upcoming" as const,
          })),
          ...(data.ongoing ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "ongoing" as const,
          })),
          ...(data.completed ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "previous" as const,
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
          <PatientDetails
            patient={patientData}
            appointments={appointments}
            loadingAppointments={loadingAppointments}
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
