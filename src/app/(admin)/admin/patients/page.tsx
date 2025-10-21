"use client";
import React, { useEffect, useState } from "react";
import { Trash2, Search, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";

interface Patient {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
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
            console.log(res.data.data);
            setPatients(res.data.data)
        });
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

  // 🗑 Delete patient (future implementation)
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this patient permanently?")) return;
    try {
      await axios.delete(`/api/patient/${id}`);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete patient.");
    }
  };

  return (
    <div className="text-sm">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h1 className="text-lg font-semibold mb-1">Search Patients</h1>
        <p className="text-xs text-gray-500 mb-3">
          Find patient records and manage data. Use delete permanent with caution.
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
          filtered.map((p) => (
            <div
              key={p.id}
              className="border border-gray-200 rounded-md px-3 py-2 flex justify-between items-center mb-2 hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-medium text-sm">
                  {p.first_name} {p.last_name}
                </p>
                {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
              </div>

              <button
                onClick={() => handleDelete(p.id)}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-md transition"
              >
                <Trash2 size={12} /> Delete Permanent
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
