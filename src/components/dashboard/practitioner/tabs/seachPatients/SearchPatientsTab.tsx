"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader";
import { Patient, Appointment } from "@/types/Dashboard";
import PatientDetails from "./PatientDetailView";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react"; // ⭐ Added icon
import { authFetch } from "@/lib/authFetch";

interface SearchPatientsTabProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient | null) => void;
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

  // State for delete confirmation modal
  const [isDeleting, setIsDeleting] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  /* -----------------------------------------------------------------
     REQUIREMENT 2: Reset to first page when tab changes
     Whenever this component mounts (tab switch), we clear the selected patient.
  ------------------------------------------------------------------ */
  useEffect(() => {
    onSelectPatient(null);
  }, []); // Run once on mount

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch("/api/booking/appointment");

      if (!res.ok) {
        throw new Error("Failed to load appointments");
      }

      const json = await res.json();

      // Handle cases where response might be an array or object with buckets
      const mergedAppointments = Array.isArray(json)
        ? json
        : [
          ...(json.ongoing || []),
          ...(json.upcoming || []),
          ...(json.past || []),
          ...(json.cancelled || []),
        ];

      setAllAppointments(mergedAppointments);

      const patientMap = new Map<string, Patient>();

      mergedAppointments.forEach((appt: any) => {
        const p = appt.patient;
        if (!p || patientMap.has(p.id)) return;

        patientMap.set(p.id, {
          id: p.id,
          patientId: p.id,
          name: p.full_name || `${p.first_name} ${p.last_name}`,
          email: p.email,
          phone: p.contact_number || p.phone,
          age: p.age ?? 0,
          gender: p.gender ?? "",
          dob: p.dob ?? "",
          allergies: Array.isArray(p.allergies)
            ? p.allergies.join(", ")
            : p.allergies || "",
          lastConsultation: "",
          consentGiven: false,
          city: p.city,
          country: p.country
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

  useEffect(() => {
    fetchAppointments();
  }, []);

  /* -----------------------------------------------------------------
     REQUIREMENT 3: Search Functionality Fix
     Filtering logic updated to be robust and reactive.
  ------------------------------------------------------------------ */
  const filteredPatients = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    if (!q) return patients;

    return patients.filter(
      (p) =>
        (p.name?.toLowerCase() || "").includes(q) ||
        (p.email?.toLowerCase() || "").includes(q) ||
        (p.phone?.toLowerCase() || "").includes(q)
    );
  }, [patients, search]);

  /* -----------------------------------------------------------------
     REQUIREMENT 4: Delete API Integration
  ------------------------------------------------------------------ */
  const handlePermanentDelete = async () => {
    if (!patientToDelete) return;

    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/patient/${patientToDelete.id}/delete`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Patient removed successfully");
        // Refresh the list
        fetchAppointments();
      } else {
        toast.error("Unable to delete patient");
      }
    } catch (err) {
      toast.error("An error occurred during deletion");
    } finally {
      setIsDeleting(false);
      setPatientToDelete(null);
    }
  };

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
          doctorName: a.practitioner ? `${a.practitioner.first_name} ${a.practitioner.last_name}` : "",
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
          room_key: a?.room_key,
        };
      });

    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={patientAppointments}
        onBack={() => onSelectPatient(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Search Patients
            </div>
            <div className="text-xs text-slate-500">
              Find patient records and manage data. Use delete permanent with caution.
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
          {loading && (
            <div className="flex justify-center py-10">
              <Loader />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>
          )}

          {!loading && !error && filteredPatients.map((p) => (
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

              <Button
                variant="danger"
                size="sm"
                className="text-xs px-4"
                onClick={() => setPatientToDelete(p)}
              >
                🗑 Delete
              </Button>
            </div>
          ))}

          {!loading && !error && filteredPatients.length === 0 && (
            <p className="text-xs text-slate-500 py-4 text-center">
              No patients found matching "{search}".
            </p>
          )}
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      {patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete <span className="font-bold">{patientToDelete.name}</span>?
              This action will remove them from your appointments and cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPatientToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handlePermanentDelete}
                loading={isDeleting}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPatientsTab;