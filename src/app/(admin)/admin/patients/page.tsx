"use client";
import React, { useEffect, useState } from "react";
import { Trash2, RotateCcw, Search, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

interface Patient {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  archived_at?: string | null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 🧠 Fetch patients from Cliniko API (via backend)
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await axios.get("/api/patient").then(res=>{
            setPatients(res.data.data);
        });
        // const data = res.data?.data?.patients || [];
        // console.log(data)
        // setPatients(data);
      } catch (err: any) {
        console.error("❌ Failed to fetch patients:", err);
        setError(err.response?.data?.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // 🔍 Filter by name/email/phone
  const filtered = patients.filter((p) => {
    const fullName = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase();
    const term = search.toLowerCase();
    return (
      fullName.includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.phone?.includes(term)
    );
  });

  // 🗑 Archive / Unarchive patient (Cliniko API)
  const handleToggleArchive = async (id: number, archived: boolean) => {
    const action = archived ? "unarchive" : "archive";
    const confirmMsg = archived
      ? "Restore this patient from archive?"
      : "Archive this patient?";
    if (!confirm(confirmMsg)) return;

    try {
      await axios.post(`/api/patient/${id}/${action}`);

      // update local state
      setPatients((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, archived_at: archived ? null : new Date().toISOString() } : p
        )
      );
    } catch (err:any) {
        console.log(err)
      alert(`Failed to ${action} patient. ${err.response.request.statusText}`);
    }
  };

  return (
    <div className="text-sm">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold mb-1">Search Patients</h1>
        <p className="text-xs text-gray-500 mb-3">
          Find patient records and manage data. You can archive (soft delete) or unarchive them.
        </p>

        {/* 🔎 Search Input */}
        <div className="relative mb-3">
          <Search className="absolute top-2.5 left-3 text-gray-400" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-200 outline-none"
          />
        </div>

        {/* ⏳ Loading State */}
        {loading && (
          <div className="flex justify-center py-10 text-gray-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading patients...
          </div>
        )}

        {/* ❌ Error State */}
        {error && !loading && (
          <div className="flex items-center gap-2 text-red-600 py-3">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ✅ Patient List */}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-gray-500 py-6 text-xs">No patients found.</p>
        )}

        {!loading &&
          !error &&
          filtered.map((p) => {
            const archived = !!p.archived_at;
            return (
              <div
                key={p.id}
                className={`border border-gray-200 rounded-md px-3 py-2 flex justify-between items-center mb-2 transition ${
                  archived ? "bg-gray-50 opacity-70" : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="font-medium text-sm">
                    {p.first_name} {p.last_name}
                    {archived && (
                      <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        Archived
                      </span>
                    )}
                  </p>
                  {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                  {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                </div>

                <button
                  onClick={() => handleToggleArchive(p.id, archived)}
                  className={`flex items-center gap-1 text-xs px-3 py-1 rounded-md transition ${
                    archived
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {archived ? (
                    <>
                      <RotateCcw size={12} /> Unarchive
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} /> Archive
                    </>
                  )}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
