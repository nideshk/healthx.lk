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

        const rows: PricingRow[] = Object.entries(fees).map(
          ([id, item]) => ({
            id,
            type: item.type,
            duration: `${item.duration_mins} mins`,
            fee: item.fee,
            platformFee: item.platform_fee,
            maxAttendees: item.max_attendee,
            extraFeePerAttendee: item.extra_fee_per_attendee,
          })
        );

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
        <div className="text-sm font-semibold text-slate-900">
          Pricing
        </div>
        <div className="text-xs text-slate-500">
          Consultation fee configuration
        </div>
      </div>

      {/* ---------------- TABLE HEADER ---------------- */}
      <div className="grid grid-cols-5 text-sm font-medium text-slate-600 border-b border-slate-200 pb-2">
        <div>Appointment Type</div>
        <div>Duration</div>
        <div>Fee (LKR)</div>
        <div>Platform Fee</div>
        <div>Max Attendees</div>
      </div>

      {/* ---------------- PRICING ROWS ---------------- */}
      {loading ? (
        <div className="text-xs text-slate-500">
          Loading pricing...
        </div>
      ) : (
        <div className="space-y-3">
          {pricing.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-5 items-center gap-4"
            >
              <div className="text-sm text-slate-900">
                {item.type}
              </div>

              <div className="text-sm text-slate-700">
                {item.duration}
              </div>

              <Input
                value={String(item.fee)}
                disabled
                className="max-w-[100px]"
              />

              <div className="text-sm text-slate-700">
                LKR {item.platformFee}
              </div>

              <div className="text-sm text-slate-700">
                {item.maxAttendees}
              </div>
            </div>
          ))}

          {!loading && pricing.length === 0 && (
            <div className="text-xs text-slate-500">
              No pricing configured.
            </div>
          )}
        </div>
      )}

      {/* ---------------- PLATFORM INFO ---------------- */}
      {pricing.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <span className="text-amber-600 text-lg">•</span>
          <div className="text-xs text-amber-800">
            <span className="font-medium">
              Platform Fee Information
            </span>
            <div className="mt-1">
              Platform fee of{" "}
              <b>{pricing[0].platformFee} LKR</b> is applied per
              consultation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingTab;
