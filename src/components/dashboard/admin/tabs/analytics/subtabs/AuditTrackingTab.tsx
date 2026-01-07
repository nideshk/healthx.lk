"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import GenericTable, { Column } from "./GenericTable";
import { ShieldCheck, Download, ChevronLeft, ChevronRight, Globe } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type AuditLogItem = {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  purpose: string;
  source: string; // Added source field
  ip_address: string;
  metadata: Record<string, any>;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const AuditTrackingTab: React.FC = () => {
  // Filters State
  const [fromDate, setFromDate] = useState<string>(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState<string>(
    DateTime.now().endOf("month").toISODate() || ""
  );
  
  // Data State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 15;

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        page: page.toString(),
        limit: limit.toString()
      });

      // API 39: HIPAA Audit Logs
      const response = await fetch(`/api/hipaa-audit-logs?${queryParams}`);
      const result = await response.json();
      
      if (result?.success) {
        setLogs(result.data || []);
        setTotalLogs(result.total || 0);
      } else {
        toast.error("Failed to retrieve audit data");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Network error while loading logs");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, page]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const totalPages = useMemo(() => Math.ceil(totalLogs / limit) || 1, [totalLogs, limit]);

  /* -------------------------------------------------------------------------- */
  /* RECURSIVE METADATA PARSER                                                  */
  /* -------------------------------------------------------------------------- */
  const parseMetadata = (data: any): React.ReactNode => {
    if (data === null || data === undefined) return <span className="text-slate-400 italic text-[10px]">None</span>;

    if (typeof data === 'object' && !Array.isArray(data)) {
      return (
        <div className="pl-2 border-l border-slate-200 flex flex-col gap-1 my-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="text-[10px] leading-tight">
              <span className="font-bold text-slate-500 uppercase tracking-tighter">{key.replace(/_/g, ' ')}:</span>{" "}
              <span className="text-slate-700">{parseMetadata(value)}</span>
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(data)) {
      return (
        <div className="flex flex-wrap gap-1">
          {data.map((item, i) => (
            <span key={i} className="bg-slate-100 px-1 rounded text-[10px]">{parseMetadata(item)}</span>
          ))}
        </div>
      );
    }

    return String(data);
  };

  /* -------------------------------------------------------------------------- */
  /* TABLE COLUMNS DEFINITION                                                   */
  /* -------------------------------------------------------------------------- */
  const columns: Column<AuditLogItem>[] = [
    {
      header: "Date & Time",
      render: (log) => (
        <span className="text-slate-600 whitespace-nowrap">
          {DateTime.fromISO(log.occurred_at).toFormat("yyyy-MM-dd HH:mm:ss")}
        </span>
      )
    },
    {
      header: "Actor",
      render: (log) => (
        <div>
          {/* <div className="font-medium text-slate-800">{log.actor_user_id.split("-")[0]}...</div> */}
          <div className="text-[12px] text-blue-600 uppercase font-bold">{log.actor_role}</div>
        </div>
      )
    },
    {
      header: "Action",
      render: (log) => (
        <div className="flex flex-col gap-1">
          <ActionBadge text={log.action} />
        </div>
      )
    },
    {
      header: "Entity",
      render: (log) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[12px] text-slate-700">{log.entity_type}</span>
        </div>
      )
    },
    {
      header: "Purpose",
      render: (log) => (
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-slate-700">{log.purpose}</span>
        </div>
      )
    },
     {
      header: "Source",
      render: (log) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[12px] text-slate-700">
            <Globe size={11} />
            {log.source}
          </div>
        </div>
      )
    },
    {
      header: "Metadata",
      render: (log) => (
        <div className="max-w-[400px] bg-slate-50/50 p-2 rounded-lg border border-slate-100">
          {parseMetadata(log.metadata)}
        </div>
      )
    },
    {
      header: "Network Details",
      render: (log) => (
        <span className="font-mono text-xs text-slate-500">{log.ip_address}</span>
      )
    }
  ];

  /* -------------------------------------------------------------------------- */
  /* EXCEL EXPORT                                                               */
  /* -------------------------------------------------------------------------- */
  const handleDownloadExcel = () => {
    try {
      if (logs.length === 0) return toast.info("No logs to export");
      
      const exportData = logs.map(log => ({
        ID: log.id,
        Timestamp: DateTime.fromISO(log.occurred_at).toFormat("yyyy-MM-dd HH:mm:ss"),
        Actor: `${log.actor_user_id} (${log.actor_role})`,
        Action: log.action,
        Entity: log.entity_type,
        Purpose: log.purpose,
        Source: log.source,
        IP_Address: log.ip_address,
        Metadata: JSON.stringify(log.metadata)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Logs");
      XLSX.writeFile(workbook, `HIPAA_Audit_Export_${DateTime.now().toFormat("yyyyLLdd")}.xlsx`);
      toast.success("Excel report generated successfully");
    } catch (err) {
      toast.error("Excel export failed");
    }
  };

  return (
    <div className="space-y-6">
      

      {/* FILTER CONTROLS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input 
          type="date" 
          label="Start Date" 
          value={fromDate} 
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }} 
        />
        <Input 
          type="date" 
          label="End Date" 
          value={toDate} 
          onChange={(e) => { setToDate(e.target.value); setPage(1); }} 
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

      {/* TABLE COMPONENT */}
      <GenericTable 
        columns={columns} 
        data={logs} 
        loading={loading} 
      />

      {/* PAGINATION SECTION */}
      <div className="flex items-center justify-between px-2 pb-8">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-800">{logs.length}</span> results 
          <span className="mx-1">•</span> 
          Page {page} of {totalPages}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={16} />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              // Simple logic to show current, first, last and surrounding pages if needed
              if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - page) <= 1) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      page === pageNum 
                        ? "bg-blue-600 text-white shadow-sm" 
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled={page === totalPages || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                   */
/* -------------------------------------------------------------------------- */

const ActionBadge = ({ text }: { text: string }) => {
  const styles: Record<string, string> = {
    VIEWED: "bg-blue-100 text-blue-700 border-blue-200",
    CREATED: "bg-green-100 text-green-700 border-green-200",
    UPDATED: "bg-amber-100 text-amber-700 border-amber-200",
    DELETED: "bg-red-100 text-red-700 border-red-200",
  };

  const currentStyle = styles[text.toUpperCase()] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentStyle} w-fit`}>
      {text}
    </span>
  );
};

export default AuditTrackingTab;