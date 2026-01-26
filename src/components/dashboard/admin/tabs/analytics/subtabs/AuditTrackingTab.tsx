"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import GenericTable, { Column } from "../subtabs/GenericTable";
import { 
  ShieldCheck, 
  Download, 
  Globe, 
  Eye, 
  X, 
  FileJson, 
  LayoutList 
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";

/* -------------------------------------------------------------------------- */
/* CONFIGURATION: ALLOWED FIELDS FOR PRETTY VIEW                              */
/* -------------------------------------------------------------------------- */
const ALLOWED_METADATA_FIELDS = [
  "filters",
  "stats",
  "query",
  "resultCount",
  "page",
  "total_pages",
  "upcoming",
  "completed",
  "cancelled",
  "total_bookings",
  "full_name",
  "specialization",
  "timezone",
  "active_clinicians",
  "from",
  "to",
  "type"
];

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AuditLogItem = {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  purpose: string;
  source: string;
  ip_address: string;
  metadata: Record<string, any>;
  user_agent?: string;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const AuditTrackingTab: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>(DateTime.now().startOf("month").toISODate() || "");
  const [toDate, setToDate] = useState<string>(DateTime.now().endOf("month").toISODate() || "");
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dynamic Pagination States
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ 
        fromDate, 
        toDate, 
        page: page.toString(), 
        limit: perPage.toString() 
      });
      const response = await authFetch(`/api/hipaa-audit-logs?${queryParams}`);
      if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.status}`);
        }
      const result = await response.json();
      if (result?.success) {
        setLogs(result.data || []);
        setTotalLogs(result.total || 0);

        console.log("logs -----------")
        console.log(result.data)
      }
    } catch (error) {
      toast.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, page, perPage]);

  useEffect(() => { 
    fetchAuditLogs(); 
  }, [fetchAuditLogs]);

  const totalPages = useMemo(() => Math.ceil(totalLogs / perPage) || 1, [totalLogs, perPage]);

  const handleExportExcel = () => {
    if (!logs.length) {
      toast.warning("No data available to export");
      return;
    }

    const rows = logs.map((log) => ({
      "Timestamp": DateTime
        .fromISO(log.occurred_at)
        .toFormat("yyyy-MM-dd HH:mm:ss"),

      "Actor": log.actor_role,

      "Action": log.action,

      "Entity": log.entity_type,

      "Source": log.source,

      // Since table shows a "View Details" button,
      // Excel should get readable content
      "Metadata": JSON.stringify(log.metadata, null, 2),

      "IP Address": log.ip_address,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");

    const fileName = `audit_logs_${fromDate}_to_${toDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    toast.success("Audit logs exported successfully");
  };

  const columns: Column<AuditLogItem>[] = [
    {
      header: "Timestamp",
      render: (log) => <span className="text-slate-600">{DateTime.fromISO(log.occurred_at).toFormat("yyyy-MM-dd HH:mm:ss")}</span>
    },
    {
      header: "Actor",
      render: (log) => <span className="text-blue-600 uppercase font-bold text-xs">{log.actor_role}</span>
    },
    {
      header: "Action",
      render: (log) => <ActionBadge text={log.action} />
    },
    {
      header: "Entity",
      render: (log) => <span className="font-mono text-xs text-slate-700">{log.entity_type}</span>
    },
    {
      header: "Source",
      render: (log) => (
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Globe size={12} /> {log.source}
        </div>
      )
    },
    {
      header: "Metadata",
      render: (log) => (
        <button 
          onClick={() => { setSelectedLog(log); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-xs font-semibold"
        >
          <Eye size={14} /> View Details
        </button>
      )
    },
    {
      header: "IP Address",
      render: (log) => <span className="font-mono text-xs text-slate-400">{log.ip_address}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <Input type="date" label="Start Date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" label="End Date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <div className="md:col-span-2 flex justify-end">
          <Button icon={<Download size={14} />} onClick={handleExportExcel}>Extract Excel</Button>
        </div>
      </div>

      <GenericTable 
        columns={columns} 
        data={logs} 
        loading={loading}
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          totalResults: totalLogs,
          perPage: perPage,
          onPageChange: (newPage) => setPage(newPage),
          onLimitChange: (newLimit) => {
            setPerPage(newLimit);
            setPage(1); // Reset to first page on limit change
          }
        }}
      />

      <div className="pb-10" />

      {isModalOpen && selectedLog && (
        <MetadataModal log={selectedLog} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MODAL COMPONENT                                                            */
/* -------------------------------------------------------------------------- */

const MetadataModal = ({ log, onClose }: { log: AuditLogItem; onClose: () => void }) => {
  const [viewMode, setViewMode] = useState<"pretty" | "raw">("pretty");

  const renderPrettyContent = (data: any): React.ReactNode => {
    if (!data || typeof data !== "object") return <span className="font-medium text-slate-800">{String(data)}</span>;

    const entries = Object.entries(data).filter(([key]) => 
      viewMode === "raw" ? true : ALLOWED_METADATA_FIELDS.includes(key)
    );

    if (entries.length === 0) return <span className="text-slate-400 italic">No displayable fields found.</span>;

    return (
      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key} className="border-b border-slate-100 pb-2 last:border-0">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</span>
            <div className="pl-2 border-l-2 border-blue-100">
              {typeof value === 'object' ? renderPrettyContent(value) : <span className="text-sm text-slate-700">{String(value)}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600" size={20} /> Audit Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 flex gap-2">
          <button onClick={() => setViewMode("pretty")} className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${viewMode === "pretty" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-600 border-slate-200"}`}><LayoutList size={16} /> Pretty View</button>
          <button onClick={() => setViewMode("raw")} className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all ${viewMode === "raw" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-600 border-slate-200"}`}><FileJson size={16} /> Raw JSON</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            {viewMode === "pretty" ? renderPrettyContent(log.metadata) : (
              <pre className="text-xs font-mono text-blue-400 bg-slate-900 p-4 rounded-xl overflow-x-auto">{JSON.stringify(log, null, 2)}</pre>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose}>Close Detail View</Button>
        </div>
      </div>
    </div>
  );
};

const ActionBadge = ({ text }: { text: string }) => {
  const styles: Record<string, string> = {
    VIEWED: "bg-blue-100 text-blue-700 border-blue-200",
    CREATED: "bg-green-100 text-green-700 border-green-200",
    UPDATED: "bg-amber-100 text-amber-700 border-amber-200",
    DELETED: "bg-red-100 text-red-700 border-red-200",
    EXPORTED: "bg-purple-100 text-purple-700 border-purple-200",
  };
  const current = styles[text.toUpperCase()] || "bg-slate-100 text-slate-600 border-slate-200";
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${current}`}>{text}</span>
};

export default AuditTrackingTab;