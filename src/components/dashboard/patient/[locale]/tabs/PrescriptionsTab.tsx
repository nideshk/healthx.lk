"use client";

import React, { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { useTranslations } from "next-intl";
import { FileText, ExternalLink, Calendar, User, Search, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/atom/Card/Card";
import Loader from "@/components/atom/Loader/Loader";

interface Prescription {
  id: string;
  appointment_id: string;
  status: string;
  issued_at: string;
  created_at: string;
  pdf_url: string | null;
  practitioner: {
    name: string;
  };
}

export default function PrescriptionsTab() {
  const t = useTranslations("prescriptionsTab");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader size="lg" />
        <p className="text-sm text-slate-500 italic">Finding your prescriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-100">
        <p className="text-red-600 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 rounded-3xl shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{t("emptyTitle")}</h3>
        <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
          {t("emptyDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {prescriptions.map((px) => (
          <Card key={px.id} className="group hover:shadow-md transition-all duration-300 border-l-4 border-l-cx-primary">
            <CardBody className="p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cx-tint rounded-2xl text-cx-primary group-hover:bg-cx-deep group-hover:text-white transition-colors duration-300 flex-shrink-0">
                    <FileText size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-wider text-cx-primary bg-cx-tint px-2 py-0.5 rounded-full border border-cx-tint">
                        {px.status}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        ID: {px.id.split('-')[0]}
                      </p>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-cx-deep transition-colors">
                      {t("practitioner")}: {px.practitioner.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{t("issuedOn")}: {new Date(px.issued_at || px.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:self-center">
                  {px.pdf_url ? (
                    <a
                      href={px.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-cx-primary hover:bg-cx-deep text-white rounded-2xl font-bold text-sm shadow-lg shadow-cx-primary/20 transition-all active:scale-[0.98]"
                    >
                      <ExternalLink size={16} />
                      {t("viewPdf")}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic font-medium px-4 py-2 bg-slate-50 rounded-xl border border-dotted border-slate-200">
                      Processing PDF...
                    </span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
