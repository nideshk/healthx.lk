"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";
import { Trash2 } from "lucide-react";

// Updated interfaces to strictly match the latest API response
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

const PricingSettings: React.FC = () => {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const getPractitionerId = async (): Promise<string> => {
    try {
      const response = await authFetch("/api/auth/me");
      if (!response.ok) throw new Error("Failed to fetch practitioner info");
      const data = await response.json();
      return data?.user?.practitioner_id || "";
    } catch (err) {
      console.error("Failed to get practitioner ID:", err);
      throw err;
    }
  };

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      const practitionerId = await getPractitionerId();
      const response = await authFetch(
        `/api/practitioners/${practitionerId}/pricing`
      );
      if (!response.ok) throw new Error("Failed to fetch pricing data");
      const data = await response.json();
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

      // Note: We don't have full metadata for removed active fees in this simple response, 
      // but we add it to available types with default values if not already present.
      const alreadyAvailable = prev.available_pricing_types.find(a => a.appointment_type_id === feeId);

      const newAvailablePricingTypes = [...prev.available_pricing_types];
      if (!alreadyAvailable) {
        newAvailablePricingTypes.push({
          appointment_type_id: feeId,
          name: removedService.type,
          base_fee: removedService.fee,
          platform_fee: 0,
          duration_mins: removedService.duration_mins || 0,
          max_attendee: removedService.max_attendee || 1,
          extra_fee_per_attendee: removedService.extra_fee_per_attendee || null,
        });
      }

      return {
        ...prev,
        fees: updatedFees,
        available_pricing_types: newAvailablePricingTypes,
      };
    });
  };

  const addAvailableService = (service: AvailablePricingType) => {
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
        (t) => t.appointment_type_id !== service.appointment_type_id
      );

      return {
        ...prev,
        fees: updatedFees,
        available_pricing_types: updatedAvailable,
      };
    });
  };

  const savePricingData = async () => {
    if (!pricingData) return;
    try {
      setSaving(true);
      const practitionerId = pricingData.practitioner_id;

      // Clean the fees object for the request body
      const cleanedFees = Object.entries(pricingData.fees).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            fee: value.fee,
            type: value.type,
            platform_fee: value.platform_fee,
            duration_mins: value.duration_mins,
            max_attendee: value.max_attendee,
            extra_fee_per_attendee: value.extra_fee_per_attendee,
          };
          return acc;
        },
        {} as Record<string, any>
      );

      const response = await authFetch(
        `/api/practitioners/${practitionerId}/pricing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fees: cleanedFees,
            available_services: Object.keys(pricingData.fees),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save pricing data");

      toast.success("Pricing updated successfully");
      await fetchPricingData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-xl p-5 bg-white flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-8 bg-white space-y-10 shadow-sm">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Appointment Fees
        </h2>
        <p className="text-sm text-slate-500">
          Configure pricing and platform limits for your services
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {pricingData && (
        <div className="space-y-10">
          <Section title="Service Charges">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header */}
                <div className="grid grid-cols-4 gap-6 pb-3 border-b border-slate-200 mb-6 items-center px-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Appointment Type
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Base Fee (LKR)
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Info
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    Action
                  </div>
                </div>

                {/* Rows */}
                <div className="space-y-1">
                  {Object.entries(pricingData.fees).map(([feeId, details]) => (
                    <div
                      key={feeId}
                      className="grid grid-cols-4 gap-6 items-center py-4 px-2 hover:bg-slate-50 rounded-lg transition-colors group text-sm"
                    >
                      <div className="text-sm font-semibold text-slate-700">
                        {details.type}
                      </div>

                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={details.fee.toString()}
                          onChange={(e) =>
                            updateFee(feeId, Number(e.target.value))
                          }
                          className="max-w-[160px] h-11 border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-medium">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{details.duration_mins} mins</span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Max {details.max_attendee} Attendees</span>
                      </div>

                      <div className="flex justify-center">
                        <button
                          onClick={() => removeFee(feeId)}
                          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                          title="Remove Service"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* New Section: Available Services Selection */}
          {pricingData.available_pricing_types &&
            pricingData.available_pricing_types.length > 0 && (
              <Section title="Add Available Services">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {pricingData.available_pricing_types.map((service) => (
                    <div
                      key={service.appointment_type_id}
                      className="flex items-center justify-between p-5 border border-slate-200 rounded-xl bg-white hover:border-blue-200 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {service.name}
                        </div>
                        <div className="flex gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">{service.duration_mins} mins</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">Max {service.max_attendee} Attendees</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addAvailableService(service)}
                        className="px-5 py-2 text-xs font-bold bg-white border border-slate-200 text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
        </div>
      )}

      <div className="pt-8 border-t border-slate-100 flex justify-end">
        <Button
          onClick={savePricingData}
          disabled={saving}
          className="w-full sm:w-[240px] h-12 rounded-lg font-bold text-sm transition-all active:scale-[0.98]"
        >
          {saving ? "Saving Changes..." : "Save Charges"}
        </Button>
      </div>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="animate-in fade-in duration-500">
    <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
      {title}
      <div className="h-[1px] flex-grow bg-slate-100"></div>
    </div>
    {children}
  </div>
);

export default PricingSettings;