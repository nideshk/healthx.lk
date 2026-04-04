"use client";

import React, { useEffect, useState } from "react";
import Input from "@/components/atom/Input/Input";
import { authFetch } from "@/lib/authFetch";

/* -------------------- API TYPES -------------------- */

interface PricingApiItem {
  fee: number;
  type: string;
  platform_fee: number;
  duration_mins: number;
  max_attendee: number;
  extra_fee_per_attendee: number;
}

/* -------------------- UI TYPES -------------------- */

interface PricingRow {
  id: string;
  type: string;
  duration: string;
  fee: number;
  platformFee: number;
  maxAttendees: number;
  extraFeePerAttendee: number;
}

interface PricingTabProps {
  clinicianId: string;
}

/* -------------------- COMPONENT -------------------- */

const PricingTab: React.FC<PricingTabProps> = ({ clinicianId }) => {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* -------------------- FETCH PRICING -------------------- */

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoading(true);

        const res = await authFetch(
          `/api/practitioners/${clinicianId}/pricing`,
          { credentials: "include" }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch pricing");
        }

        const data = await res.json();

        // ✅ Cast ONCE – Object.entries otherwise returns [string, unknown][]
        const fees = data.fees as Record<string, PricingApiItem>;

        const rows: PricingRow[] = Object.entries(fees).map(([id, item]) => ({
          id,
          type: item.type,
          duration: `${item.duration_mins || 0} mins`,
          fee: item.fee,
          platformFee: item.platform_fee || 0,
          maxAttendees: item.max_attendee || 0,
          extraFeePerAttendee: item.extra_fee_per_attendee || 0,
        }));

        setPricing(rows);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (clinicianId) {
      fetchPricing();
    }
  }, [clinicianId]);

  /* -------------------- UI -------------------- */

  return (
    <div className="space-y-6">
      {/* ---------------- HEADER ---------------- */}
      <div>
        <div className="text-sm font-semibold text-slate-900">Pricing</div>
        <div className="text-xs text-slate-500">
          Consultation fee configuration
        </div>
      </div>

      {/* ---------------- TABLE HEADER ---------------- */}
      <div className="grid grid-cols-6 text-sm font-medium text-slate-600 border-b border-slate-200 pb-2">
        <div>Type</div>
        <div>Duration</div>
        <div>Base Fee</div>
        <div>Platform Fee</div>
        <div>Max Atnd.</div>
        <div>Extra Fee</div>
      </div>

      {/* ---------------- PRICING ROWS ---------------- */}
      {loading ? (
        <div className="text-xs text-slate-500">Loading pricing...</div>
      ) : (
        <div className="space-y-3">
          {pricing.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-6 items-center gap-4 text-xs"
            >
              <div className="text-slate-900 truncate" title={item.type}>
                {item.type}
              </div>

              <div className="text-slate-600">{item.duration}</div>

              <div className="text-slate-900 font-medium">
                {item.fee.toLocaleString()} LKR
              </div>

              <div className="text-slate-600">
                {item.platformFee.toLocaleString()} LKR
              </div>

              <div className="text-slate-600">{item.maxAttendees}</div>

              <div className="text-slate-600">
                {item.extraFeePerAttendee.toLocaleString()} LKR
              </div>
            </div>
          ))}

          {!loading && pricing.length === 0 && (
            <div className="text-xs text-slate-500">No pricing configured.</div>
          )}
        </div>
      )}

      {/* ---------------- PLATFORM INFO ---------------- */}
      {pricing.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <span className="text-amber-600 text-lg">•</span>
          <div className="text-xs text-amber-800">
            <span className="font-medium">Platform Fee Information</span>
            <div className="mt-1">
              The platform fee and attendee limits are synced from the global
              appointment configuration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingTab;
