"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader";
import PatientDetails from "./PatientDetails";
import { Patient } from "@/types/Dashboard";
import { toast } from "react-toastify";
import { Trash2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  category: "upcoming" | "previous";
}

interface SearchPatientTabProps {
  search: string;
  onSearchChange: (v: string) => void;
  patients?: Patient[];
  loading?: boolean;
  selectedPatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  onBackToDashboard: () => void;
}

// Global Time Formatter
const formatGlobalTime = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return timeStr;
  }
};

const SearchPatientTab: React.FC<SearchPatientTabProps> = ({
  search,
  onSearchChange,
  patients: initialPatients = [],
  loading: initialLoading = false,
  selectedPatient,
  onSelectPatient,
  onBackToDashboard,
}) => {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Local state management
  const [localPatients, setLocalPatients] =
    useState<Patient[]>(initialPatients);
  const [localLoading, setLocalLoading] = useState(initialLoading);

  // Deletion States
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local state with props when search/initial patients change
  useEffect(() => {
    setLocalPatients(initialPatients);
    setLocalLoading(initialLoading);
  }, [initialPatients, initialLoading]);

  /* -------------------------------------------------------------------------- */
  /* REFRESH LIST LOGIC                               */
  /* -------------------------------------------------------------------------- */
  const fetchPatientList = async () => {
    try {
      setLocalLoading(true);
      const url = search
        ? `/api/patient?page=1&limit=20&q=${encodeURIComponent(search)}`
        : `/api/patient?page=1&limit=20`;

      const res = await authFetch(url, { credentials: "include" });
      if (!res.ok) {
          throw new Error(`Failed to fetch Patients: ${res.status}`);
      }
      const data = await res.json();

      if (data.success) {
        setLocalPatients(data.data || []);
      }
    } catch (err) {
      console.error("Failed to refresh patient list", err);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPatient) return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const res = await authFetch(
          `/api/patient/${selectedPatient.id}/appointments`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const json = await res.json();

        const mapped: AdminAppointment[] = [
          ...(json.scheduled ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: formatGlobalTime(a.start_time),
            doctorName: a.doctor?.name || "Unknown",
            category: "upcoming",
          })),
          ...(json.completed ?? []).map((a: any) => ({
            id: a.id,
            date: a.appointment_date,
            time: formatGlobalTime(a.start_time),
            doctorName: a.doctor?.name || "Unknown",
            category: "previous",
          })),
        ];
        setAppointments(mapped);
      } catch (err) {
        console.error("Error fetching appointments", err);
        setAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };
    fetchAppointments();
  }, [selectedPatient]);

  /* -------------------------------------------------------------------------- */
  /* DELETION HANDLER                                */
  /* -------------------------------------------------------------------------- */

  const confirmDelete = (patient: Patient) => {
    setPatientToDelete(patient);
  };

  const handlePermanentDelete = async () => {
    if (!patientToDelete) return;

    try {
      setIsDeleting(true);
      const res = await authFetch(`/api/patient/${patientToDelete.id}/delete`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
          throw new Error(`Failed to delete patient: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        // 1. Instant UI update: Filter out the deleted patient from local state
        setLocalPatients((prev) =>
          prev.filter((p) => p.id !== patientToDelete.id)
        );

        // 2. Success feedback
        toast.success(data.message || "Patient removed successfully ✨");

        // 3. Close modal
        setPatientToDelete(null);

        // 4. Robust sync: Fetch the latest list from server
        await fetchPatientList();
      } else {
        throw new Error(data.message || "Failed to delete patient");
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "An error occurred during deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={appointments}
        loadingAppointments={loadingAppointments}
        onBack={onBackToDashboard}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 w-full">
            <div className="text-sm font-semibold text-slate-900">
              Search Patients
            </div>
            <div className="text-xs text-slate-500">
              Find records and manage data.
            </div>
            <div className="mt-2">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-2 relative min-h-[200px]">
          {localLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <Loader />
            </div>
          ) : (
            <>
              {localPatients.length > 0 ? (
                localPatients.map((p) => (
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
                      onClick={() => confirmDelete(p)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-10">
                  {search.length > 0
                    ? "No patients found for this search."
                    : "No patients available."}
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* ---------------- DELETION MODAL ---------------- */}
      {patientToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setPatientToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="p-2 bg-red-100 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Confirm Deletion</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete the record for{" "}
              <span className="font-bold text-slate-900">
                {patientToDelete.name}
              </span>
              ? This will remove all associated appointment history and cannot
              be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                onClick={() => setPatientToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handlePermanentDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPatientTab;
