"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { FileText, ExternalLink, Calendar, Search, Loader2, User } from "lucide-react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Loader from "@/components/atom/Loader/Loader";

interface Prescription {
  id: string;
  appointment_id: string;
  status: string;
  issued_at: string;
  created_at: string;
  pdf_url: string | null;
  patients: {
    full_name: string;
    email: string;
  };
  diagnoses?: {
    name: string;
    code: string;
  };
}

export default function PractitionerPrescriptionsTab() {
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
        console.error("Prescriptions fetch error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchPrescriptions();
  }, []);

  const filteredPrescriptions = prescriptions.filter(px => 
    px.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    px.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader size="lg" />
        <p className="text-sm text-slate-500 italic">Loading issued prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Prescription History</h2>
          <p className="text-sm text-slate-500 font-medium">Track and review all prescriptions you've issued</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
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
          <h3 className="text-xl font-bold text-slate-900 mb-2">No prescriptions found</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
            {searchTerm ? "No results match your search criteria." : "You haven't issued any prescriptions yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((px) => (
            <Card key={px.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 overflow-hidden">
              <CardBody className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6">
                  <div className="flex items-start gap-5">
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm">
                      <FileText size={28} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 ring-2 ring-white">
                          {px.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                          Ref: {px.id.split('-')[0]}
                        </p>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                        Patient: {px.patients?.full_name || "Unknown Patient"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500 font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <span>Issued: {new Date(px.issued_at || px.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        </div>
                        {px.diagnoses && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg text-slate-600 border border-slate-200">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                             <span>{px.diagnoses.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 lg:self-center">
                    {px.pdf_url ? (
                      <a
                        href={px.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 transition-all active:scale-[0.98] group/btn"
                      >
                        <ExternalLink size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        View PDF
                      </a>
                    ) : (
                      <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Document Pending
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
