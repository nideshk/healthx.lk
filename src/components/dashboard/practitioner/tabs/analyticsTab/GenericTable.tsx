"use client";

import React from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface GenericTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  minWidth?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

const GenericTable = <T extends { id: string | number }>({
  columns,
  data,
  loading,
  minWidth = "1200px",
  pagination,
}: GenericTableProps<T>) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl relative overflow-hidden shadow-sm">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-2xl">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm`} style={{ minWidth }}>
          <thead className="bg-blue-600 text-white sticky top-0 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-4 text-left font-semibold ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-4 ${col.className || ""}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-20 text-slate-400 italic">
                    No records found for the selected period.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-6 py-4 bg-slate-50 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pagination.perPage}
                onChange={(e) => pagination.onLimitChange(Number(e.target.value))}
                className="border border-slate-300 rounded px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 20, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Total: {pagination.totalResults} records</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={pagination.currentPage === 1 || loading}
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={pagination.currentPage === pagination.totalPages || loading}
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericTable;