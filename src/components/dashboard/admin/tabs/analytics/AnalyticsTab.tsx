"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Users,
  RotateCcw,
  XCircle,
  ShieldCheck,
  Clock,
} from "lucide-react";

import Input from "@/components/atom/Input/Input";

// Sub tabs
import TrackBookingsTab from "./subtabs/TrackBookingsTab";
import FollowUpNeededTab from "./subtabs/FollowUpNeededTab";
import RefundsRequestedTab from "./subtabs/RefundsRequestedTab";
import CancellationsTab from "./subtabs/CancellationsTab";
import AuditTrackingTab from "./subtabs/AuditTrackingTab";
/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type AnalyticsTabKey =
  | "Track Bookings"
  | "Follow-up Needed"
  | "Refunds Requested"
  | "Cancellations"
  | "Audit Tracking"
  | "Timestamps";

/* -------------------------------------------------------------------------- */
/*                               TAB CONFIG                                   */
/* -------------------------------------------------------------------------- */

const ANALYTICS_TABS: {
  key: AnalyticsTabKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "Track Bookings",
    label: "Track Bookings",
    icon: <CalendarDays size={16} />,
  },
  {
    key: "Follow-up Needed",
    label: "Follow-up Needed",
    icon: <Users size={16} />,
  },
  {
    key: "Refunds Requested",
    label: "Refunds Requested",
    icon: <RotateCcw size={16} />,
  },
  {
    key: "Cancellations",
    label: "Cancellations",
    icon: <XCircle size={16} />,
  },
  {
    key: "Audit Tracking",
    label: "Audit Tracking",
    icon: <ShieldCheck size={16} />,
  },
  {
    key: "Timestamps",
    label: "Timestamps",
    icon: <Clock size={16} />,
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const AnalyticsTab: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<AnalyticsTabKey>("Track Bookings");

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------ */}
      {/* HEADER                                           */}
      {/* ------------------------------------------------ */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="text-lg font-semibold">Analytics</div>
        <div className="text-xs opacity-90">
          Comprehensive analytics and tracking
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* ANALYTICS TABS (SCROLLABLE X + Y)                */}
      {/* ------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {ANALYTICS_TABS.map((tab) => (
    <AnalyticsButton
      key={tab.key}
      label={tab.label}
      icon={tab.icon}
      active={activeTab === tab.key}
      onClick={() => setActiveTab(tab.key)}
    />
  ))}
</div>

      {/* FILTER SECTION (COMMON)                          */}
      {/* ------------------------------------------------ */}
      {/* <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="date" label="From Date" />
          <Input type="date" label="To Date" />

          <div>
            <label className="text-xs text-slate-600 mb-1 block">
              Specialty
            </label>
            <select className="w-full border border-slate-300 rounded-xl p-2 text-sm">
              <option>All Specialties</option>
              <option>General Physician</option>
              <option>Psychiatry</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-600 mb-1 block">
              Doctor
            </label>
            <select className="w-full border border-slate-300 rounded-xl p-2 text-sm">
              <option>All doctors</option>
              <option>Dr. Kumari Silva</option>
              <option>Dr. Nimal Perera</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* ------------------------------------------------ */}
      {/* TAB CONTENT                                     */}
      {/* ------------------------------------------------ */}
      {activeTab === "Track Bookings" && <TrackBookingsTab />}

      {activeTab === "Follow-up Needed" && <FollowUpNeededTab />}

      {activeTab === "Refunds Requested" && <RefundsRequestedTab />}
      
      {activeTab === "Cancellations" && <CancellationsTab />}

      {activeTab === "Audit Tracking" && <AuditTrackingTab />}

    </div>
  );
};

export default AnalyticsTab;

/* -------------------------------------------------------------------------- */
/*                          ANALYTICS BUTTON                                  */
/* -------------------------------------------------------------------------- */

const AnalyticsButton = ({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-4
        px-6 py-5
        rounded-2xl
        text-base font-medium
        transition-all
        border
        ${
          active
            ? "bg-blue-600 text-white border-blue-600 shadow-md"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }
      `}
    >
      <span
        className={`flex items-center justify-center w-10 h-10 rounded-xl ${
          active ? "bg-white/20" : "bg-slate-100"
        }`}
      >
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
};

