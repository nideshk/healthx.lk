"use client";
import React, { useEffect, useState } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";
import { authFetch } from "@/lib/authFetch";
import { toast } from "react-toastify";
import { Trash2, AlertCircle, Plus } from "lucide-react";

/* -------------------- TYPES -------------------- */

interface FeeDetails {
  fee: number;
  type: string;
  platform_fee?: number;
  duration_mins?: number;
  max_attendee?: number;
  extra_fee_per_attendee?: number | null;
}

interface AvailablePricingType {
  appointment_type_id: string;
  name: string;
  base_fee: number;
  platform_fee: number;
  duration_mins: number;
  max_attendee: number;
  extra_fee_per_attendee: number | null;
}

interface PricingData {
  practitioner_id: string;
  fees: Record<string, FeeDetails>;
  available_pricing_types: AvailablePricingType[];
}

interface PricingTabProps {
  clinicianId: string;
}

/* -------------------- COMPONENT -------------------- */

const PricingTab: React.FC<PricingTabProps> = ({ clinicianId }) => {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------- FETCH DATA -------------------- */

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/practitioners/${clinicianId}/pricing`);
      if (!res.ok) throw new Error("Failed to fetch pricing data");
      const data = await res.json();
      setPricingData(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicianId) {
      fetchPricingData();
    }
  }, [clinicianId]);

  /* -------------------- ACTIONS -------------------- */

  const updateFee = (feeId: string, newFee: number) => {
    if (!pricingData) return;
    setPricingData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fees: {
          ...prev.fees,
          [feeId]: { ...prev.fees[feeId], fee: newFee },
        },
      };
    });
  };

  const removeFee = (feeId: string) => {
    if (!pricingData) return;
    setPricingData((prev) => {
      if (!prev) return prev;
      const updatedFees = { ...prev.fees };
      const removedService = updatedFees[feeId];
      if (!removedService) return prev;

      delete updatedFees[feeId];

      const newAvailable = [...prev.available_pricing_types];
      if (!newAvailable.find(a => a.appointment_type_id === feeId)) {
        newAvailable.push({
          appointment_type_id: feeId,
          name: removedService.type,
          base_fee: removedService.fee,
          platform_fee: 0,
          duration_mins: removedService.duration_mins || 0,
          max_attendee: removedService.max_attendee || 1,
          extra_fee_per_attendee: removedService.extra_fee_per_attendee || null,
        });
      }

      return { ...prev, fees: updatedFees, available_pricing_types: newAvailable };
    });
  };

  const addService = (service: AvailablePricingType) => {
    if (!pricingData) return;
    setPricingData((prev) => {
      if (!prev) return prev;
      const updatedFees = {
        ...prev.fees,
        [service.appointment_type_id]: {
          fee: service.base_fee,
          type: service.name,
          platform_fee: service.platform_fee,
          duration_mins: service.duration_mins,
          max_attendee: service.max_attendee,
          extra_fee_per_attendee: service.extra_fee_per_attendee,
        },
      };
      const updatedAvailable = prev.available_pricing_types.filter(
        t => t.appointment_type_id !== service.appointment_type_id
      );
      return { ...prev, fees: updatedFees, available_pricing_types: updatedAvailable };
    });
  };

  const saveChanges = async () => {
    if (!pricingData) return;
    try {
      setSaving(true);
      const res = await authFetch(`/api/practitioners/${clinicianId}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fees: pricingData.fees,
          available_services: Object.keys(pricingData.fees),
        }),
      });

      if (!res.ok) throw new Error("Failed to save pricing");
      toast.success("Pricing updated successfully");
      await fetchPricingData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- UI -------------------- */

  if (loading) return <div className="py-12 flex justify-center"><Loader /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* ---------------- ACTIVE SERVICES ---------------- */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Services</h3>
            <p className="text-xs text-slate-500 mt-1">Configure consultation fees for this clinician</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Appointment Type</th>
                <th className="px-6 py-4">Base Fee (LKR)</th>
                <th className="px-6 py-4 text-center">Details</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {Object.entries(pricingData?.fees || {}).map(([id, details]) => (
                <tr key={id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700">{details.type}</td>
                  <td className="px-6 py-4">
                    <Input
                      type="number"
                      value={details.fee.toString()}
                      onChange={(e) => updateFee(id, Number(e.target.value))}
                      className="max-w-[140px] h-10 text-sm border-slate-200"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-center">
                       <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{details.duration_mins} mins</span>
                       <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">Max {details.max_attendee} Attendees</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => removeFee(id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {Object.keys(pricingData?.fees || {}).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No services configured.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- AVAILABLE SERVICES ---------------- */}
      {pricingData?.available_pricing_types && pricingData.available_pricing_types.length > 0 && (
        <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Available Services</h3>
            <div className="h-[1px] flex-grow bg-slate-100"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingData.available_pricing_types.map((service) => (
              <div key={service.appointment_type_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                <div>
                  <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{service.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">Default: {service.base_fee} LKR • {service.duration_mins} mins</div>
                </div>
                <button
                  onClick={() => addService(service)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- FOOTER ---------------- */}
      <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 max-w-[500px]">
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-[10px] leading-tight">Platform fees and attendee limits are managed globally in system settings.</p>
         </div>
         <Button
            onClick={saveChanges}
            disabled={saving || !pricingData}
            className="px-8 h-12 font-bold transition-all active:scale-95"
         >
            {saving ? "Saving..." : "Save Pricing Changes"}
         </Button>
      </div>
    </div>
  );
};

export default PricingTab;
