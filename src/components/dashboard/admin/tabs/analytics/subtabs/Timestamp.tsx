"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import GenericTable, { Column } from "./GenericTable";
import { Download } from "lucide-react";
import { authFetch } from "@/lib/authFetch";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
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
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const TimestampTab: React.FC = () => {
  // Filters & State
  const [fromDate, setFromDate] = useState<string>(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState<string>(
    DateTime.now().endOf("month").toISODate() || ""
  );
  const [userType] = useState<"All" | "Doctor" | "Admin" | "System">("All");

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        userType,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await authFetch(
        `/api/consultation/audit-log?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }

      const result = await response.json();

      if (result?.data) {
        // Map the data to ensure every item has an 'id' for GenericTable's requirement
        const formattedData = result.data.map((item: AuditLogItem) => ({
          ...item,
          id: item.appointment_id,
        }));
        setLogs(formattedData);
        setTotalPages(result.totalPages || 1);
        setTotalResults(result.totalCount || result.data.length);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, userType, page, limit]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  /* -------------------------------------------------------------------------- */
  /* HELPERS                                                                    */
  /* -------------------------------------------------------------------------- */

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
  /* TABLE COLUMNS CONFIGURATION                                                */
  /* -------------------------------------------------------------------------- */

  const columns: Column<AuditLogItem>[] = useMemo(
    () => [
      {
        header: "Appointment ID",
        className: "font-mono text-[10px] text-slate-500",
        render: (item) => item.appointment_id,
      },
      {
        header: "Status",
        render: (item) => <StatusBadge status={item.appointment.status} />,
      },
      {
        header: "Schedule Start",
        className: "whitespace-nowrap",
        render: (item) => formatTimestamp(item.appointment.starts_at),
      },
      {
        header: "Patient Activity",
        render: (item) => (
          <div>
            <div className="text-xs">
              <span className="font-semibold">Joined:</span>{" "}
              {formatTimestamp(item.participant_summary.patient.started_at)}
            </div>
            <div className="text-xs text-slate-500">
              Dur:{" "}
              {formatDuration(
                item.participant_summary.patient.duration_seconds
              )}{" "}
              | Events: {item.participant_summary.patient.event_count}
            </div>
          </div>
        ),
      },
      {
        header: "Practitioner Activity",
        render: (item) => (
          <div>
            <div className="text-xs">
              <span className="font-semibold">Joined:</span>{" "}
              {formatTimestamp(
                item.participant_summary.practitioner.started_at
              )}
            </div>
            <div className="text-xs text-slate-500">
              Dur:{" "}
              {formatDuration(
                item.participant_summary.practitioner.duration_seconds
              )}{" "}
              | Events: {item.participant_summary.practitioner.event_count}
            </div>
          </div>
        ),
      },
      {
        header: "No Show",
        render: (item) => (
          <div className="flex flex-col gap-1">
            {item.appointment.patient_no_show && (
              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 w-fit">
                Patient NS
              </span>
            )}
            {item.appointment.practitioner_no_show && (
              <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 w-fit">
                Dr NS
              </span>
            )}
            {!item.appointment.patient_no_show &&
              !item.appointment.practitioner_no_show && (
                <span className="text-slate-400 text-xs">-</span>
              )}
          </div>
        ),
      },
      {
        header: "Meeting Duration",
        className: "font-medium",
        render: (item) => formatDuration(item.meeting_duration_seconds),
      },
    ],
    []
  );

  /* -------------------------------------------------------------------------- */
  /* EXCEL DOWNLOAD LOGIC                                                       */
  /* -------------------------------------------------------------------------- */
  const handleDownloadExcel = async () => {
    try {
      if (logs.length === 0) {
        toast.info("No data available to download");
        return;
      }

      const excelRows = logs.map((log) => ({
        "Appointment ID": log.appointment_id,
        Status: log.appointment.status,
        "Scheduled Start": formatTimestamp(log.appointment.starts_at),
        "Meeting Duration": formatDuration(log.meeting_duration_seconds),
        "Patient Join Time": formatTimestamp(
          log.participant_summary.patient.started_at
        ),
        "Patient Duration (s)":
          log.participant_summary.patient.duration_seconds,
        "Patient Events": log.participant_summary.patient.event_count,
        "Practitioner Join Time": formatTimestamp(
          log.participant_summary.practitioner.started_at
        ),
        "Practitioner Duration (s)":
          log.participant_summary.practitioner.duration_seconds,
        "Practitioner Events": log.participant_summary.practitioner.event_count,
        "Patient No Show": log.appointment.patient_no_show ? "Yes" : "No",
        "Practitioner No Show": log.appointment.practitioner_no_show
          ? "Yes"
          : "No",
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
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
          onChange={(e) => {
            setPage(1);
            setFromDate(e.target.value);
          }}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate}
          onChange={(e) => {
            setPage(1);
            setToDate(e.target.value);
          }}
        />

        <div className="flex items-end justify-end md:col-start-4">
          <Button
            icon={<Download size={14} />}
            size="sm"
            onClick={handleDownloadExcel}
          >
            Extract Excel
          </Button>
        </div>
      </div>

      {/* DYNAMIC GENERIC TABLE */}
      <GenericTable
        data={logs as any} // Cast because GenericTable expects T extends {id: ...}
        columns={columns as any}
        loading={loading}
        minWidth="1400px"
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          totalResults: totalResults,
          perPage: limit,
          onPageChange: (newPage) => setPage(newPage),
          onLimitChange: (newLimit) => {
            setLimit(newLimit);
            setPage(1); // Reset to page 1 when limit changes
          },
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* INTERNAL HELPERS                                                           */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700 border-green-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <span
      className={`${
        colorMap[status.toLowerCase()] || "bg-slate-100 text-slate-600"
      } px-2 py-1 rounded-full text-[10px] font-bold uppercase border`}
    >
      {status}
    </span>
  );
};

export default TimestampTab;
