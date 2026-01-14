"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { BookingStats, AnalyticsTabId } from "@/types/Dashboard";
import TimestampsView from "./TimestampsView";
import RevenueBreakdownModal from "./RevenueBreakdownModal";
import Loader from "@/components/atom/Loader/Loader";
import GenericTable, { Column } from "./GenericTable";
import { X, Download } from "lucide-react";
import * as XLSX from "xlsx";

/* ---------- constants ---------- */

const EMPTY_BOOKING_STATS: BookingStats = {
  totalBookings: 0,
  completed: 0,
  cancelled: 0,
  refunds: 0,
  upcoming: 0,
  revenue: 0,
  currency: "LKR",
};

/* ---------- types ---------- */

type DetailType = "total" | "upcoming" | "completed" | "cancelled" | "refunds" | null;

interface BookingRecord {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  patient: { name: string; email: string } | null;
  practitioner: { name: string; email: string } | null;
  appointment_type: string;
  cancellation_reason?: string | null;
  payment_status?: string | null;
}

export interface AuditLogRow {
  id: string;
  appointment_id: string;
  status: string;
  schedule_start: string;
  patient_activity: {
    joined: string | null;
    duration: string;
    events: number;
  };
  practitioner_activity: {
    joined: string | null;
    duration: string;
    events: number;
  };
  no_show: string;
  meeting_duration: string;
}

/* ---------- helpers ---------- */

const formatDuration = (seconds: number | null): string => {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

/* ---------- component ---------- */

const AnalyticsTab: React.FC = () => {
  /* --- UI State --- */
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>("bookings");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  /* --- Filter State --- */
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  /* --- Data State --- */
  const [stats, setStats] = useState<BookingStats>(EMPTY_BOOKING_STATS);
  const [revenueBreakdown, setRevenueBreakdown] = useState({
    platformFees: 0,
    consultationFees: 0,
    serviceFees: 0,
    taxes: 0,
  });

  /* --- Detail Table State --- */
  const [selectedDetail, setSelectedDetail] = useState<DetailType>(null);
  const [detailData, setDetailData] = useState<BookingRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    perPage: 10,
  });

  /* --- Timestamps Data State --- */
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPagination, setAuditPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    perPage: 10,
  });

  /* --- Logic: Fetch Summary Stats --- */
  const fetchAnalyticsSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch("/api/auth/me", { credentials: "include" });
      if (!authRes.ok) throw new Error("Authentication failed");
      const me = await authRes.json();
      const pId = me?.user?.practitioner_id ?? me?.practitioner_id;
      if (!pId) throw new Error("Practitioner profile not found");

      const [analyticsRes, transactionRes] = await Promise.all([
        fetch(`/api/practitioners/${pId}/analytics`, { credentials: "include" }),
        fetch(`http://localhost:3000/api/analytics/transactions/practitioner`, { credentials: "include" })
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to fetch booking statistics");
      const data = await analyticsRes.json();
      
      let tData = { analytics: { totalGrossAmount: 0, totalPlatformFees: 0, totalConsultationFees: 0, totalServiceFees: 0, totalTaxes: 0 } };
      if (transactionRes.ok) {
        tData = await transactionRes.json();
      }

      setStats({
        totalBookings: data.total_bookings ?? 0,
        completed: data.completed ?? 0,
        cancelled: data.cancelled ?? 0,
        refunds: data.refunds_requested ?? 0,
        upcoming: data.upcoming ?? 0,
        revenue: tData.analytics.totalGrossAmount ?? 0,
        currency: "LKR",
      });

      setRevenueBreakdown({
        platformFees: tData.analytics.totalPlatformFees,
        consultationFees: tData.analytics.totalConsultationFees,
        serviceFees: tData.analytics.totalServiceFees,
        taxes: tData.analytics.totalTaxes,
      });

    } catch (e: any) {
      setError(e.message);
      setStats(EMPTY_BOOKING_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  /* --- Logic: Fetch Detail Table --- */
  const fetchDetailData = useCallback(async () => {
    if (!selectedDetail) return;
    setDetailLoading(true);
    try {
      const url = new URL(`http://localhost:3000/api/booking`);
      url.searchParams.append("from", fromDate);
      url.searchParams.append("to", toDate);
      url.searchParams.append("type", selectedDetail);
      url.searchParams.append("page", pagination.currentPage.toString());
      url.searchParams.append("per_page", pagination.perPage.toString());

      const response = await fetch(url.toString(), { credentials: "include" });
      const result = await response.json();
      
      if (result.success) {
        setDetailData(result.data);
        setPagination(prev => ({
          ...prev,
          totalPages: result.meta.total_pages,
          totalResults: result.meta.total,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch booking details", err);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedDetail, fromDate, toDate, pagination.currentPage, pagination.perPage]);

  /* --- Logic: Fetch Timestamp Audits --- */
  const fetchTimestampAudits = useCallback(async () => {
    if (activeTab !== "timestamps") return;
    setAuditLoading(true);
    try {
      const url = new URL(`http://localhost:3000/api/consultation/audit-log`);
      url.searchParams.append("from", fromDate);
      url.searchParams.append("to", toDate);
      url.searchParams.append("page", auditPagination.currentPage.toString());
      url.searchParams.append("per_page", auditPagination.perPage.toString());

      const response = await fetch(url.toString(), { credentials: "include" });
      const result = await response.json();

      if (result.data) {
        const mappedData: AuditLogRow[] = result.data.map((item: any) => ({
          id: item.appointment_id,
          appointment_id: item.appointment_id,
          status: item.appointment?.status?.toUpperCase() ?? "N/A",
          schedule_start: item.appointment?.starts_at ?? "",
          patient_activity: {
            joined: item.participant_summary?.patient?.started_at ?? null,
            duration: formatDuration(item.participant_summary?.patient?.duration_seconds),
            events: item.participant_summary?.patient?.event_count ?? 0,
          },
          practitioner_activity: {
            joined: item.participant_summary?.practitioner?.started_at ?? null,
            duration: formatDuration(item.participant_summary?.practitioner?.duration_seconds),
            events: item.participant_summary?.practitioner?.event_count ?? 0,
          },
          no_show: item.appointment?.patient_no_show ? "Patient" : (item.appointment?.practitioner_no_show ? "Practitioner" : "-"),
          meeting_duration: formatDuration(item.meeting_duration_seconds),
        }));

        setAuditLogs(mappedData);
        setAuditPagination(prev => ({
          ...prev,
          totalPages: result.meta?.total_pages ?? 1,
          totalResults: result.meta?.total ?? mappedData.length,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  }, [activeTab, fromDate, toDate, auditPagination.currentPage, auditPagination.perPage]);

  /* --- Logic: Export to Excel --- */
  const handleExportExcel = () => {
    const dataToExport = activeTab === "bookings" ? detailData : auditLogs;
    if (dataToExport.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics_Report");
    XLSX.writeFile(workbook, `Report_${activeTab}_${new Date().getTime()}.xlsx`);
  };

  /* --- Effects --- */
  useEffect(() => {
    fetchAnalyticsSummary();
  }, [fetchAnalyticsSummary]);

  useEffect(() => {
    fetchDetailData();
  }, [fetchDetailData]);

  useEffect(() => {
    fetchTimestampAudits();
  }, [fetchTimestampAudits]);

  /* --- Handlers --- */
  const handleStatClick = (type: DetailType) => {
    setSelectedDetail(prev => (prev === type ? null : type));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  /* --- Table Config --- */
  const bookingColumns = useMemo<Column<BookingRecord>[]>(() => [
    {
      header: "Patient Details",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-900">{item.patient?.name ?? "Unknown Patient"}</div>
          <div className="text-xs text-slate-500">{item.patient?.email ?? "No Email"}</div>
        </div>
      ),
    },
    {
      header: "Practitioner",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-900">{item.practitioner?.name ?? "Unknown Practitioner"}</div>
          <div className="text-xs text-slate-500">{item.practitioner?.email ?? "No Email"}</div>
        </div>
      ),
    },
    {
      header: "Appointment Date",
      render: (item) => (
        <div>
          <div className="text-slate-900">{item.appointment_date}</div>
          <div className="text-xs text-slate-500">{`${item.start_time} - ${item.end_time}`}</div>
        </div>
      ),
    },
    {
      header: "Type",
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {item.appointment_type}
        </span>
      ),
    },
    {
      header: "Status",
      render: (item) => {
        const status = item.status?.toLowerCase();
        const config = {
          completed: "bg-green-50 text-green-700 border-green-100",
          cancelled: "bg-red-50 text-red-700 border-red-100",
          default: "bg-blue-50 text-blue-700 border-blue-100"
        };
        const style = config[status as keyof typeof config] || config.default;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      header: "Payment",
      render: (item) => (
        <span className={`text-xs font-bold ${item.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
          {item.payment_status?.toUpperCase() ?? "N/A"}
        </span>
      ),
    },
    {
      header: "Cancellation reason",
      render: (item) => <div className="text-slate-700 text-xs italic">{item.cancellation_reason ?? "N/A"}</div>,
    },
  ], []);

  const detailTitle = useMemo(() => {
    if (!selectedDetail) return "";
    return `${selectedDetail.charAt(0).toUpperCase() + selectedDetail.slice(1)} Bookings List`.replace("Total", "All");
  }, [selectedDetail]);

  return (
    <div className="space-y-4">
      {/* Header with Export Button */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Analytics</h1>
          <p className="text-xs text-slate-500">View your appointment analytics and detailed audit logs</p>
        </div>
        {(selectedDetail || activeTab === "timestamps") && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            <Download size={14} /> Extract Excel
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-full bg-slate-100 p-1 text-xs">
        {(["bookings", "timestamps"] as const).map((tab) => (
          <AnalyticsTabButton
            key={tab}
            id={tab}
            label={tab === "bookings" ? "Track Bookings" : "Timestamps"}
            active={activeTab}
            onClick={setActiveTab}
          />
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="lg" theme="light" />
        </div>
      ) : activeTab === "bookings" ? (
        <div className="space-y-6">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          
          <BookingsView
            stats={stats}
            fromDate={fromDate}
            toDate={toDate}
            onChangeFromDate={setFromDate}
            onChangeToDate={setToDate}
            onRevenueClick={() => setShowRevenueModal(true)}
            onStatClick={handleStatClick}
            activeDetail={selectedDetail}
          />

          {selectedDetail && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-t-xl px-6 py-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
                  {detailTitle}
                </h3>
                <button 
                  onClick={() => setSelectedDetail(null)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors"
                >
                  <X size={14} /> Close Table
                </button>
              </div>
              <GenericTable
                columns={bookingColumns}
                data={detailData}
                loading={detailLoading}
                minWidth="1000px"
                pagination={{
                  ...pagination,
                  onPageChange: (page: number) => setPagination(prev => ({ ...prev, currentPage: page })),
                  onLimitChange: (limit: number) => setPagination(prev => ({ ...prev, perPage: limit, currentPage: 1 })),
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <TimestampsView
          rows={auditLogs}
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
          loading={auditLoading}
          pagination={{
            ...auditPagination,
            onPageChange: (page: number) => setAuditPagination(prev => ({ ...prev, currentPage: page })),
            onLimitChange: (limit: number) => setAuditPagination(prev => ({ ...prev, perPage: limit, currentPage: 1 })),
          }}
        />
      )}

      {showRevenueModal && (
        <RevenueBreakdownModal
          data={revenueBreakdown}
          onClose={() => setShowRevenueModal(false)}
        />
      )}
    </div>
  );
};

export default AnalyticsTab;

/* ---------- sub components ---------- */

const AnalyticsTabButton = ({
  id,
  label,
  active,
  onClick,
}: {
  id: AnalyticsTabId;
  label: string;
  active: AnalyticsTabId;
  onClick: (id: AnalyticsTabId) => void;
}) => (
  <button
    onClick={() => onClick(id)}
    className={`flex-1 rounded-full px-3 py-2 font-medium transition-all ${
      id === active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
    }`}
  >
    {label}
  </button>
);

const BookingsView = ({
  stats,
  fromDate,
  toDate,
  onChangeFromDate,
  onChangeToDate,
  onRevenueClick,
  onStatClick,
  activeDetail,
}: {
  stats: BookingStats;
  fromDate: string;
  toDate: string;
  onChangeFromDate: (v: string) => void;
  onChangeToDate: (v: string) => void;
  onRevenueClick: () => void;
  onStatClick: (type: DetailType) => void;
  activeDetail: DetailType;
}) => {
  const statCards = [
    { id: "total", label: "Total Bookings", value: stats.totalBookings, bg: "bg-blue-500" },
    { id: "completed", label: "Appts. Completed", value: stats.completed, bg: "bg-green-500" },
    { id: "cancelled", label: "Cancelled Bookings", value: stats.cancelled, bg: "bg-red-500" },
    { id: "refunds", label: "Refunds Requested", value: stats.refunds, bg: "bg-amber-400" },
    { id: "upcoming", label: "Upcoming Appointments", value: stats.upcoming, bg: "bg-orange-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <DateInput label="From Date" value={fromDate} onChange={onChangeFromDate} />
        <DateInput label="To Date" value={toDate} onChange={onChangeToDate} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Stat
            key={card.id}
            label={card.label}
            value={card.value}
            bg={card.bg}
            onClick={() => onStatClick(card.id as DetailType)}
            active={activeDetail === card.id}
          />
        ))}
        <Stat
          label="Total Revenue"
          value={`${stats.currency} ${stats.revenue.toLocaleString()}`}
          bg="bg-purple-500"
          onClick={onRevenueClick}
        />
      </div>
    </div>
  );
};

const DateInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="space-y-1">
    <div className="text-[11px] text-slate-500">{label}</div>
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
    />
  </div>
);

const Stat = ({
  label,
  value,
  bg,
  onClick,
  active
}: {
  label: string;
  value: string | number;
  bg: string;
  onClick?: () => void;
  active?: boolean;
}) => (
  <div
    onClick={onClick}
    className={`rounded-xl px-4 py-3 text-xs font-medium text-white transition-all transform ${bg} ${
      onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""
    } ${active ? "ring-4 ring-offset-2 ring-slate-200 shadow-lg" : "opacity-100"}`}
  >
    <div className="text-[11px] opacity-90">{label}</div>
    <div className="mt-1 text-sm font-bold">{value}</div>
  </div>
);