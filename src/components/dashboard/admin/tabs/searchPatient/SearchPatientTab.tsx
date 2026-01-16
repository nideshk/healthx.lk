"use client";

import React, { useEffect, useState } from "react";
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

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10); 

  // Deletion States
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync local state with props when initial patients change
  useEffect(() => {
    setLocalPatients(initialPatients);
    setLocalLoading(initialLoading);
  }, [initialPatients, initialLoading]);

  // Reset page when search term or limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, limit]);

  /* -------------------------------------------------------------------------- */
  /* DYNAMIC FETCH LOGIC                                                        */
  /* -------------------------------------------------------------------------- */
  const fetchPatientList = async (page: number) => {
    try {
      setLocalLoading(true);
      const queryParam = search ? `&q=${encodeURIComponent(search)}` : "";
      const url = `/api/patient?page=${page}&limit=${limit}${queryParam}`;

      const res = await authFetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch Patients: ${res.status}`);
      }
      const data = await res.json();

      if (data.success) {
        setLocalPatients(data.data || []);
        
        // Robust total pages calculation
        const totalCount = data.pagination?.totalItems || data.total || 0;
        const apiTotalPages = data.pagination?.totalPages;
        
        if (apiTotalPages) {
            setTotalPages(apiTotalPages);
        } else if (totalCount > 0) {
            setTotalPages(Math.ceil(totalCount / limit));
        } else {
            // Fallback: if we got exactly 'limit' items, assume there might be a next page
            setTotalPages(data.data?.length === limit ? currentPage + 1 : currentPage);
        }
      }
    } catch (err) {
      console.error("Failed to refresh patient list", err);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientList(currentPage);
  }, [currentPage, search, limit]);

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
        await fetchPatientList(currentPage);
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
          <div className="w-full space-y-4">
            {/* Header Text and Show Dropdown Row */}
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
                <span className="text-xs text-slate-500 font-medium">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="text-xs border border-slate-200 rounded p-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {[3, 10, 20, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Search Input Box - Below Header Text */}
            <div className="w-full">
              <Input
                placeholder="Search by name, email, or phone"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
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

          {/* ---------------- PAGINATION CONTROLS ---------------- */}
          {/* Always show if we have data or are past page 1 to allow navigation */}
          {(localPatients.length > 0 || currentPage > 1) && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
              <div className="text-xs text-slate-500 font-medium">
                Page{" "}
                <span className="font-bold text-slate-900">{currentPage}</span> 
                {totalPages > 1 && <> of <span className="font-bold text-slate-900">{totalPages}</span></>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8"
                  disabled={currentPage === 1 || localLoading}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8"
                  disabled={(totalPages > 1 && currentPage === totalPages) || (localPatients.length < limit) || localLoading}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
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