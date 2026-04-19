"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { FileText, ExternalLink, Calendar, Search, User, Stethoscope } from "lucide-react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Loader from "@/components/atom/Loader/Loader";

interface Prescription {
  id: string;
  appointment_id: string;
  status: string;
  issued_at: string;
  created_at: string;
  pdf_url: string | null;
  patient: {
    id: string;
    name: string;
  };
  practitioner: {
    id: string;
    name: string;
  };
}

export default function AdminPrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchPrescriptions() {
      try {
        setLoading(true);
        const res = await authFetch("/api/booking/prescriptions");
        if (!res.ok) {
          throw new Error("Failed to fetch prescriptions");
        }
        const data = await res.json();
        setPrescriptions(data.data || []);
      } catch (err: any) {
        console.error("Admin Prescriptions fetch error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchPrescriptions();
  }, []);

  const filteredPrescriptions = prescriptions.filter(px => 
    px.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    px.practitioner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    px.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader size="lg" />
        <p className="text-sm text-slate-500 italic">Loading platform-wide prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Platform Prescriptions</h2>
          <p className="text-sm text-slate-500 font-medium">Monitor and manage all issued medical documents</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search patient, doctor, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
          >
            Try Again
          </button>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
            <FileText className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No prescriptions matched</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
            {searchTerm ? "Try adjusting your search terms." : "No prescriptions have been issued on the platform yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((px) => (
            <Card key={px.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-slate-800 overflow-hidden">
              <CardBody className="p-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between p-6 gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-4 bg-slate-100 rounded-2xl text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm">
                      <FileText size={28} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 flex-1">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patient</p>
                        </div>
                        <h4 className="text-lg font-black text-slate-900">
                          {px.patient?.name || "Unknown"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {px.patient?.id.split('-')[0]}</p>
                      </div>

                      <div className="space-y-1 border-slate-100 md:border-l md:pl-8">
                        <div className="flex items-center gap-2">
                          <Stethoscope size={14} className="text-slate-400" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Practitioner</p>
                        </div>
                        <h4 className="text-lg font-black text-slate-900">
                          {px.practitioner?.name || "Unknown"}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Issued: {new Date(px.issued_at || px.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row items-center gap-3 justify-end xl:w-auto w-full">
                    <div className="flex flex-col items-end gap-1 mr-4 hidden sm:flex">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                          {px.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter">
                          #{px.id.split('-')[0]}
                        </p>
                    </div>
                    
                    {px.pdf_url ? (
                      <a
                        href={px.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                      >
                        <ExternalLink size={16} />
                        View PDF
                      </a>
                    ) : (
                      <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-dotted border-slate-300 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        Missing Document
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
