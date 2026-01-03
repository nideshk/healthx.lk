"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DateTime } from "luxon";
import * as XLSX from "xlsx"; // Ensure you have installed: npm install xlsx
import { toast } from "react-toastify"; // Ensure you have installed: npm install react-toastify
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { ShieldCheck, Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type ParticipantDetail = {
  ended_at: string | null;
  started_at: string | null;
  event_count: number;
  duration_seconds: number;
};

type AuditLogItem = {
  appointment_id: string;
  meeting_started_at: string | null;
  meeting_ended_at: string | null;
  meeting_duration_seconds: number | null;
  participant_summary: {
    patient: ParticipantDetail;
    practitioner: ParticipantDetail;
  };
  event_timeline: Array<{
    metadata: { role: string };
    created_at: string;
    event_type: string;
    appointment_id: string;
  }>;
  created_at: string;
  last_processed_at: string;
  practitioner_id: string;
  appointment: {
    id: string;
    status: string;
    ends_at: string;
    starts_at: string;
    call_ended_at: string | null;
    patient_no_show: boolean;
    practitioner_no_show: boolean;
  };
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const AuditTrackingTab: React.FC = () => {
  // Default to current month
  const [fromDate, setFromDate] = useState<string>(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState<string>(
    DateTime.now().endOf("month").toISODate() || ""
  );
  const [userType, setUserType] = useState<"All" | "Doctor" | "Admin" | "System">(
    "All"
  );
  
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        userType,
        page: page.toString(),
        limit: "10"
      });

      const response = await fetch(`/api/consultation/audit-log?${queryParams}`);
      const result = await response.json();
      
      if (result?.data) {
        setLogs(result.data);
        setTotalPages(result.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, userType, page]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return "N/A";
    return DateTime.fromISO(ts).toFormat("yyyy-MM-dd HH:mm:ss");
  };

  /* -------------------------------------------------------------------------- */
  /* EXCEL DOWNLOAD LOGIC                           */
  /* -------------------------------------------------------------------------- */
  const handleDownloadExcel = async () => {
    try {
      if (logs.length === 0) {
        toast.info("No data available to download");
        return;
      }

      // Map data to Excel-friendly format
      const excelRows = logs.map((log) => ({
        "Appointment ID": log.appointment_id,
        "Status": log.appointment.status,
        "Scheduled Start": formatTimestamp(log.appointment.starts_at),
        "Meeting Duration": formatDuration(log.meeting_duration_seconds),
        "Patient Join Time": formatTimestamp(log.participant_summary.patient.started_at),
        "Patient Duration (s)": log.participant_summary.patient.duration_seconds,
        "Patient Events": log.participant_summary.patient.event_count,
        "Practitioner Join Time": formatTimestamp(log.participant_summary.practitioner.started_at),
        "Practitioner Duration (s)": log.participant_summary.practitioner.duration_seconds,
        "Practitioner Events": log.participant_summary.practitioner.event_count,
        "Patient No Show": log.appointment.patient_no_show ? "Yes" : "No",
        "Practitioner No Show": log.appointment.practitioner_no_show ? "Yes" : "No",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

      // Trigger Browser Download
      XLSX.writeFile(workbook, `AuditLogs_${fromDate}_to_${toDate}.xlsx`);
      toast.success("Excel file downloaded successfully");
    } catch (error) {
      toast.error("Error generating Excel file");
      console.error(error);
    }
  };

  return (
    <div className="space-y-5">
      {/* FILTERS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          type="date"
          label="From Date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <div className="flex items-end justify-end">
          <Button 
            icon={<Download size={14} />} 
            size="sm" 
            onClick={handleDownloadExcel}
          >
            Extract Excel
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        )}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-blue-600 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">Appointment ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Schedule Start</th>
                <th className="px-4 py-3 text-left">Patient Activity</th>
                <th className="px-4 py-3 text-left">Practitioner Activity</th>
                <th className="px-4 py-3 text-left">Meeting Duration</th>
              </tr>
            </thead>

            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.appointment_id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                      {log.appointment_id}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.appointment.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatTimestamp(log.appointment.starts_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-semibold">Joined:</span> {formatTimestamp(log.participant_summary.patient.started_at)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Dur: {formatDuration(log.participant_summary.patient.duration_seconds)} | Events: {log.participant_summary.patient.event_count}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-semibold">Joined:</span> {formatTimestamp(log.participant_summary.practitioner.started_at)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Dur: {formatDuration(log.participant_summary.practitioner.duration_seconds)} | Events: {log.participant_summary.practitioner.event_count}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatDuration(log.meeting_duration_seconds)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                    No audit logs found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-slate-500">
          Showing Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            icon={<ChevronLeft size={14} />}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            icon={<ChevronRight size={14} />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrackingTab;

/* -------------------------------------------------------------------------- */
/* HELPERS                                       */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };

  return (
    <span className={`${colorMap[status.toLowerCase()] || "bg-slate-100 text-slate-600"} px-2 py-1 rounded-full text-[10px] font-bold uppercase`}>
      {status}
    </span>
  );
};