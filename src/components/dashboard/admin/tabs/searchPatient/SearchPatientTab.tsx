"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";
import Button from "@/components/atom/Button/Button";
import Input from "@/components/atom/Input/Input";
import Loader from "@/components/atom/Loader/Loader";
import PatientDetails from "./PatientDetails";
import { Patient } from "@/types/Dashboard";
import { toast } from "react-toastify";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

export interface AdminAppointment {
  id: string;
  date: string;
  time: string;
  info: string;
  doctorName: string;
  appointmentType: string;
  category: "upcoming" | "ongoing" | "previous" | "cancelled";
}

interface SearchPatientTabProps {}

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

const SearchPatientTab: React.FC<SearchPatientTabProps> = () => {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Local state management
  const [localPatients, setLocalPatients] = useState<Patient[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Track last fetched params to avoid redundant calls
  const lastParamsRef = useRef({ search: null as string | null, page: 1, limit: 10 });

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);

  // Deletion States
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce state
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync local state logic removed (initialPatients etc. are gone)


  /* -------------------------------------------------------------------------- */
  /* SEARCH DEBOUNCE LOGIC                                                      */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  /* -------------------------------------------------------------------------- */
  /* DYNAMIC FETCH LOGIC                                                        */
  /* -------------------------------------------------------------------------- */
 const fetchPatientList = async (page: number, searchValue: string) => {
  try {
    setLocalLoading(true);
    const params = new URLSearchParams();

    // Only search when 4+ chars
    if (searchValue && searchValue.length >= 4) {
      params.append("q", searchValue);
    }

    params.append("limit", limit.toString());
    params.append("page", page.toString());

    const res = await authFetch(`/api/patient?${params.toString()}`, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Patients: ${res.status}`);
    }
    const result = await res.json();

    if (result.data) {
      const mapped: Patient[] = result.data.map((p: any) => ({
        ...p,
        full_name: p.full_name || p.name || "",
        patientId: p.id?.slice(0, 6).toUpperCase() || "",
      }));
      setLocalPatients(mapped);

      const meta = result.meta || {};
      const totalCount = meta.total || 0;
      const apiTotalPages = meta.totalPages;

      if (apiTotalPages) {
        setTotalPages(apiTotalPages);
      } else if (totalCount > 0) {
        setTotalPages(Math.ceil(totalCount / limit));
      } else {
        setTotalPages(
          result.data.length === limit ? page + 1 : page
        );
      }
    }
  } catch (err) {
    console.error("Failed to refresh patient list", err);
  } finally {
    setLocalLoading(false);
  }
};

useEffect(() => {
  let isMounted = true;
  const runFetch = async () => {
    // Only search when length is 4 or more
    const isSearchMode = debouncedSearch && debouncedSearch.length >= 4;
    const searchToFetch = isSearchMode ? debouncedSearch : "";
    const pageToFetch = isSearchMode ? 1 : currentPage;

    // Avoid redundant fetch if same search & page/limit
    if (
      lastParamsRef.current.search === searchToFetch &&
      lastParamsRef.current.page === pageToFetch &&
      lastParamsRef.current.limit === limit
    ) {
      return;
    }

    if (isMounted) {
      await fetchPatientList(pageToFetch, searchToFetch);
      lastParamsRef.current = { search: searchToFetch, page: pageToFetch, limit };
    }
  };

  runFetch();
  return () => { isMounted = false; };
}, [debouncedSearch, currentPage, limit]);

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
        const data = await res.json();
        const mapped: AdminAppointment[] = [
          ...(data.scheduled ?? []).map((a: any) => ({
            id: a.id,
            patient_id: a.patientId,
            patientName: selectedPatient.full_name,
            email: a.patient?.email,
            contact_number: a.patient?.contact_number,
            room_key: a.room_key,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            category: "upcoming",
            appointmentType: a.appointment_type?.name || "Unknown",
          })),

          ...(data.ongoing ?? []).map((a: any) => ({
            id: a.id,
            patient_id: a.patientId,
            patientName: selectedPatient.full_name,
            email: a.patient?.email,
            contact_number: a.patient?.contact_number,
            room_key: a.room_key,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "ongoing",
          })),

          ...(data.completed ?? []).map((a: any) => ({
            id: a.id,
            patient_id: a.patientId,
            patientName: selectedPatient.full_name,
            email: a.patient?.email,
            contact_number: a.patient?.contact_number,
            room_key: a.room_key,
            date: a.appointment_date,
            time: a.start_time,
            info: `${a.appointment_date} at ${a.start_time}`,
            doctorName: a.doctor?.name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "previous",
          })),

          ...(data.cancelled ?? []).map((a: any) => ({
            id: a.id,
            patient_id: selectedPatient.id,
            patientName: selectedPatient.full_name,
            email: a.patient?.email,
            contact_number: a.patient?.contact_number,
            room_key: a.room_key,
            date: new Date(a.starts_at).toISOString().split("T")[0],
            time: new Date(a.starts_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            info: `${new Date(a.starts_at).toLocaleDateString()} at ${new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            doctorName: a.practitioner?.full_name || "Unknown",
            appointmentType: a.appointment_type?.name || "Unknown",
            category: "cancelled",
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
        toast.success(data.message || "Patient removed successfully ✨");
        setPatientToDelete(null);
        await fetchPatientList(currentPage, debouncedSearch);
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

  function maskGovernmentId(govId: any): string {
    if (!govId?.number) return "";

    const number = String(govId.number);
    const last4 = number.slice(-4);

    return `xxx-${last4}`;
  }

  function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }


  if (selectedPatient) {
    return (
      <PatientDetails
        patient={selectedPatient}
        appointments={appointments}
        loadingAppointments={loadingAppointments}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="w-full space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-slate-900">
                  Search Patients
                </div>
                <div className="text-xs text-slate-500">
                  Find records and manage data.
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">
                  Show:
                </span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {[10, 20, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-2 relative min-h-[350px] flex flex-col">
          {localLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <Loader />
            </div>
          ) : (
            <div className="flex-1 space-y-2">
              {localPatients.length > 0 ? (
                localPatients.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col text-sm">
                      <button
                        type="button"
                        className="text-blue-600 font-semibold text-left hover:underline"
                        onClick={() => setSelectedPatient(p)}
                      >
                        {p.full_name || p.name}
                      </button>
                      <span className="text-xs text-slate-500">{p.email}</span>
                      <span className="text-xs text-slate-500">
                        {p.contact_number || p.phone}
                      </span>
                      {p.government_id?.number && (
                        <span className="text-xs text-slate-500">
                          Gov ID: {maskGovernmentId(p.government_id)}
                        </span>
                      )}
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
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <p className="text-xs text-slate-500 text-center">
                    {search.length > 0
                      ? "No patients found for this search."
                      : "No patients available."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default SearchPatientTab;
