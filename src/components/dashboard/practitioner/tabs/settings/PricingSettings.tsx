"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import Loader from "@/components/atom/Loader/Loader";

interface FeeDetails {
  fee: number;
  type: string;
  duration_mins: number;
  max_attendees: number;
}

interface PricingData {
  practitioner_id: string;
  fees: Record<string, FeeDetails>;
  available_services?: string[];
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
      const response = await fetch("/api/auth/me");
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
      const response = await fetch(
        `/api/practitioners/${practitionerId}/pricing`
      );
      if (!response.ok) throw new Error("Failed to fetch pricing data");
      const data = await response.json();
      setPricingData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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

  const savePricingData = async () => {
    if (!pricingData) return;
    try {
      setSaving(true);
      const practitionerId = pricingData.practitioner_id;
      const response = await fetch(
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
      const data = await response.json();
      setPricingData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
        <Section title="Service Charges">
          <ChargeRow
            fees={pricingData.fees}
            onChange={updateFee}
          />
        </Section>
      )}

      <Button onClick={savePricingData} disabled={saving}>
        {saving ? "Saving..." : "Save Service Charges"}
      </Button>
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

const ChargeRow = ({
  fees,
  onChange,
}: {
  fees: Record<string, FeeDetails>;
  onChange: (feeId: string, fee: number) => void;
}) => (
  <div className="grid grid-cols-3 gap-4">
    {Object.entries(fees).map(([feeId, details]) => (
      <div key={feeId}>
        <Input
          label={details.type}
          type="number"
          value={details.fee.toString()}
          onChange={(e) => onChange(feeId, Number(e.target.value))}
        />
        <div className="text-xs text-slate-500 mt-1">
          {details.duration_mins}min • Max {details.max_attendees} attendee(s)
        </div>
      </div>
    ))}
  </div>
);

export default PricingSettings;