"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader";
import { Patient, Appointment } from "@/types/Dashboard";
import PatientDetails from "./PatientDetailView";

interface SearchPatientsTabProps {
  search: string;
  onSearchChange: (v: string) => void;

  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;
}

const SearchPatientsTab: React.FC<SearchPatientsTabProps> = ({
  search,
  onSearchChange,
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
}) => {
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/booking/appointment", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to load appointments");
        }

        const json = await res.json();

        // Merge all appointment buckets
        const mergedAppointments = [
          ...(json.ongoing || []),
          ...(json.upcoming || []),
          ...(json.past || []),
          ...(json.cancelled || []),
        ];

        setAllAppointments(mergedAppointments);

        /* ---------------------------------------------
           Group appointments by patient.id
        ---------------------------------------------- */
        const patientMap = new Map<string, Patient>();

        mergedAppointments.forEach((appt: any) => {
          const p = appt.patient;
          if (!p || patientMap.has(p.id)) return;

          patientMap.set(p.id, {
            id: p.id,
            patientId: p.id,
            name: p.full_name,
            email: p.email,
            phone: p.contact_number,
            age: p.age ?? 0,
            gender: p.gender ?? "",
            dob: p.dob ?? "",
            allergies: Array.isArray(p.allergies)
              ? p.allergies.join(", ")
              : "",
            lastConsultation: "",
            consentGiven: false,
          });
        });

        setPatients(Array.from(patientMap.values()));
      } catch (err: any) {
        console.error("SearchPatientsTab error:", err);
        setError(err.message || "Unable to fetch patients");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  /* -------------------------------------------------
     Search filter (name / email / phone)
  -------------------------------------------------- */
  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase();

    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
    );
  }, [patients, search]);

  /* -------------------------------------------------
     Patient details view
  -------------------------------------------------- */
  if (selectedPatient) {
    const patientAppointments: Appointment[] = allAppointments
      .filter((a) => a.patient?.id === selectedPatient.id)
      .map((a: any) => {
        const start = new Date(a.starts_at);

        const date = start.toLocaleDateString("en-GB");
        const time = start.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const category =
          a.status === "cancelled"
            ? "previous"
            : start < new Date()
            ? "previous"
            : "upcoming";

        return {
          id: a.id,
          category,
          date,
          time,
          doctorName: "",
          reason: a.appointment_type?.name || "",
          status: a.status,
          appointmentType: a.appointment_type?.name || "",
          telehealthConsent: !!a.telehealth_url,
          termsAccepted: false,
          mainConcern: "",
          goal: "",
          durationOfConcern: "",
          documents: [],
          clinicianNotes: "",
          prescriptions: "",
          followUpNeeded: false,
          followUpDate: undefined,
        };
      });

    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={patientAppointments}
        onBack={onBackToDashboard}
      />
    );
  }

  /* -------------------------------------------------
     Search + patient list view
  -------------------------------------------------- */
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Search Patients
            </div>
            <div className="text-xs text-slate-500">
              Find patient records and manage data. Use delete permanent with
              caution.
            </div>
          </div>

          <div className="w-72">
            <Input
              placeholder="Search by name, email, or phone"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardBody className="space-y-2">
          {/* Loader */}
          {loading && (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-600">{error}</div>
          )}

          {/* Patient list */}
          {!loading &&
            !error &&
            filteredPatients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex flex-col text-sm">
                  <button
                    type="button"
                    className="text-blue-600 font-semibold text-left hover:underline"
                    onClick={() => onSelectPatient(p)}
                  >
                    {p.name}
                  </button>
                  <span className="text-xs text-slate-500">{p.email}</span>
                  <span className="text-xs text-slate-500">{p.phone}</span>
                </div>

                <Button variant="danger" size="sm" className="text-xs px-4">
                  🗑 Delete Permanent
                </Button>
              </div>
            ))}

          {/* Empty state */}
          {!loading && !error && filteredPatients.length === 0 && (
            <p className="text-xs text-slate-500">
              No patients found. Try a different search.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchPatientsTab;
