"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";
import { toast } from "react-toastify";
import { authFetch } from "@/lib/authFetch";

// Interfaces updated to match your provided JSON response structure
interface FeeDetails {
  fee: number;
  platform_fee: number;
  type: string;
  duration_mins: number;
  max_attendees: number;
  extra_fee_per_attendee?: number;
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

  const addAvailableService = (service: AvailablePricingType) => {
    if (!pricingData) return;

    setPricingData((prev) => {
      if (!prev) return prev;

      // Add the selected service into the active fees object
      const updatedFees = {
        ...prev.fees,
        [service.appointment_type_id]: {
          fee: service.base_fee,
          type: service.name,
          platform_fee: service.platform_fee,
          duration_mins: service.duration_mins,
          max_attendees: service.max_attendee,
          extra_fee_per_attendee: service.extra_fee_per_attendee || 0
        }
      };

      // Filter out the added service from the available types list
      const updatedAvailable = prev.available_pricing_types.filter(
        (t) => t.appointment_type_id !== service.appointment_type_id
      );

      return {
        ...prev,
        fees: updatedFees,
        available_pricing_types: updatedAvailable
      };
    });
  };

  const savePricingData = async () => {
    if (!pricingData) return;
    try {
      setSaving(true);
      const practitionerId = pricingData.practitioner_id;
      const response = await authFetch(
        `/api/practitioners/${practitionerId}/pricing`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fees: pricingData.fees,
            available_services: Object.keys(pricingData.fees),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save pricing data");

      toast.success("Pricing updated successfully");

      // Instead of window.location.reload(), we fetch data to refresh the tab state
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
    <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-6">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          Appointment Fees
        </div>
        <div className="text-xs text-slate-500">
          Configure pricing and platform limits
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {pricingData && (
        <div className="space-y-8">
          <Section title="Service Charges">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header */}
                <div className="grid grid-cols-5 gap-4 pb-2 border-b border-slate-100 mb-4 items-center">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Appointment Type</div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider text-center">Duration</div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">Base Fee (LKR)</div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider text-center">Max Attendees</div>
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider text-right">Platform Fee (LKR)</div>
                </div>

                {/* Rows */}
                <div className="space-y-4">
                  {Object.entries(pricingData.fees).map(([feeId, details]) => (
                    <div key={feeId} className="grid grid-cols-5 gap-4 items-center py-2">
                      <div className="text-sm font-medium text-slate-700">
                        {details.type}
                      </div>
                      <div className="text-sm text-slate-700 text-center">
                        {details.duration_mins}min
                      </div>
                      <div>
                        <Input
                          type="number"
                          value={details.fee.toString()}
                          onChange={(e) => updateFee(feeId, Number(e.target.value))}
                          className="max-w-[120px]"
                        />
                      </div>
                      <div className="text-sm text-slate-700 text-center">
                        {details.max_attendees} attendee(s)
                      </div>
                      <div className="text-sm text-slate-700 text-right">
                        {details.platform_fee}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* New Section: Available Services Selection */}
          {pricingData.available_pricing_types && pricingData.available_pricing_types.length > 0 && (
            <Section title="Add Available Services">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pricingData.available_pricing_types.map((service) => (
                  <div
                    key={service.appointment_type_id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-all cursor-default group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {service.name}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-medium">
                        {service.duration_mins} mins • Max {service.max_attendee} Attendees
                      </div>
                    </div>
                    <button
                      onClick={() => addAvailableService(service)}
                      className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 text-blue-600 rounded-md shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
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

      <div className="pt-4 border-t border-slate-100">
        <Button onClick={savePricingData} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save Service Charges"}
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
  <div>
    <div className="text-sm font-medium text-slate-800 mb-3">
      {title}
    </div>
    {children}
  </div>
);

export default PricingSettings;