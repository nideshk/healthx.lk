"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { ShieldCheck, Download } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type AuditLogItem = {
  id: string;
  timestamp: string;
  patient: {
    name: string;
    id: string;
  };
  viewedSection: string;
  changeSummary: string;
  changedBy: string;
  userType: "Doctor" | "Admin" | "System";
  ipAddress: string;
};

/* -------------------------------------------------------------------------- */
/*                                MOCK DATA                                   */
/* -------------------------------------------------------------------------- */

const MOCK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "a1",
    timestamp: "2024-01-22 10:15:23",
    patient: { name: "John Doe", id: "PT-001" },
    viewedSection: "Medical History, Prescriptions",
    changeSummary: "Updated contact number",
    changedBy: "Dr. Sarah Wilson",
    userType: "Doctor",
    ipAddress: "192.168.1.101",
  },
  {
    id: "a2",
    timestamp: "2024-01-22 11:30:45",
    patient: { name: "Jane Smith", id: "PT-002" },
    viewedSection: "Consultation Notes",
    changeSummary: "Added follow-up reminder",
    changedBy: "Admin - nidesh",
    userType: "Admin",
    ipAddress: "192.168.1.100",
  },
  {
    id: "a3",
    timestamp: "2024-01-22 14:20:12",
    patient: { name: "Bob Johnson", id: "PT-003" },
    viewedSection: "Payment Records",
    changeSummary: "No changes",
    changedBy: "Dr. Michael Chen",
    userType: "Doctor",
    ipAddress: "192.168.1.102",
  },
  {
    id: "a4",
    timestamp: "2024-01-21 09:45:33",
    patient: { name: "Alice Brown", id: "PT-004" },
    viewedSection: "Full Profile",
    changeSummary: "Updated medication list",
    changedBy: "Dr. Sarah Wilson",
    userType: "Doctor",
    ipAddress: "192.168.1.101",
  },
  {
    id: "a5",
    timestamp: "2024-01-21 13:55:18",
    patient: { name: "Charlie Davis", id: "PT-005" },
    viewedSection: "Vaccination Records",
    changeSummary: "Added new vaccine entry",
    changedBy: "Dr. David Kumar",
    userType: "Doctor",
    ipAddress: "192.168.1.104",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const AuditTrackingTab: React.FC = () => {
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [userType, setUserType] = useState<"All" | "Doctor" | "Admin" | "System">(
    "All"
  );
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    /**
     * FUTURE API:
     * GET /api/admin/analytics/audit-logs
     * params: { fromDate, toDate, userType }
     */
    setLogs(MOCK_AUDIT_LOGS);
  }, [fromDate, toDate, userType]);

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------ */}
      {/* HEADER                                           */}
      {/* ------------------------------------------------ */}
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <ShieldCheck size={18} />
        Audit Tracking
      </div>

      {/* ------------------------------------------------ */}
      {/* FILTERS + CSV                                   */}
      {/* ------------------------------------------------ */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          type="date"
          label="From Date"
          value={fromDate ?? ""}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate ?? ""}
          onChange={(e) => setToDate(e.target.value)}
        />

        <div>
          <label className="text-xs text-slate-600 mb-1 block">
            User Type
          </label>
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value as any)}
            className="w-full border border-slate-300 rounded-xl p-2 text-sm"
          >
            <option value="All">All Users</option>
            <option value="Doctor">Doctor</option>
            <option value="Admin">Admin</option>
            <option value="System">System</option>
          </select>
        </div>

        <div className="flex items-end justify-end">
          <Button icon={<Download size={14} />}>
            Extract CSV
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* TABLE                                           */}
      {/* ------------------------------------------------ */}
      <div className="bg-white border border-slate-200 rounded-2xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Patient Data Accessed
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  What Was Viewed
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Changes / Updates Made
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  Who Changed / Updated
                </th>
                <th className="px-4 py-3 text-left whitespace-nowrap">
                  IP Address
                </th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.patient.name}</div>
                    <div className="text-xs text-slate-500">
                      ({log.patient.id})
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {log.viewedSection}
                  </td>
                  <td className="px-4 py-3">
                    <ChangeBadge text={log.changeSummary} />
                  </td>
                  <td className="px-4 py-3">
                    {log.changedBy}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrackingTab;

/* -------------------------------------------------------------------------- */
/*                              HELPERS                                       */
/* -------------------------------------------------------------------------- */

const ChangeBadge = ({ text }: { text: string }) => {
  if (text === "No changes") {
    return (
      <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-full text-xs">
        No changes
      </span>
    );
  }

  return (
    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
      {text}
    </span>
  );
};
