"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Loader from "@/components/atom/Loader/Loader";

interface Prescription {
  id: string;
  issued_at: string | null;
  status: string;
  created_at: string;
  patient: {
    name: string;
  };
  diagnoses?: {
    name: string;
    code: string;
  };
}

interface PrescriptionsTabProps {
  clinicianId: string;
}

const PrescriptionsTab: React.FC<PrescriptionsTabProps> = ({ clinicianId }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/booking/prescriptions?practitioner_id=${clinicianId}`, {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to fetch prescriptions");

        const json = await res.json();
        setPrescriptions(json.data || []);
      } catch (err: any) {
        console.error("Error fetching clinician prescriptions:", err);
        setError(err.message || "Failed to load prescriptions");
      } finally {
        setLoading(false);
      }
    };

    if (clinicianId) {
      fetchPrescriptions();
    }
  }, [clinicianId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader size="sm" />
        <p className="text-xs text-slate-500 italic">Fetching prescription history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 rounded-xl border border-red-100">
        <p className="text-xs text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <FileText className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs text-slate-500">No prescriptions found for this clinician.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-slate-900 px-1">Prescription History</div>
      
      <div className="overflow-hidden border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Diagnosis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prescriptions.map((px) => (
              <tr key={px.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{px.patient?.name || "Unknown"}</div>
                  <div className="text-[10px] text-slate-400 font-mono">#{px.id.split("-")[0]}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-slate-400" />
                    {new Date(px.issued_at || px.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={px.status} />
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">
                  {px.diagnoses ? (
                    <span title={px.diagnoses.name}>
                      {px.diagnoses.code} - {px.diagnoses.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Not specified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    issued: "bg-green-50 text-green-700 border-green-200",
    ready_to_issue: "bg-indigo-50 text-indigo-700 border-indigo-200",
    draft: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const style = styles[status] || styles.draft;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${style}`}>
      {status === "issued" && <CheckCircle2 size={10} />}
      {status === "ready_to_issue" && <Clock size={10} />}
      {status === "draft" && <AlertCircle size={10} />}
      {status.replace(/_/g, " ")}
    </span>
  );
};

export default PrescriptionsTab;
