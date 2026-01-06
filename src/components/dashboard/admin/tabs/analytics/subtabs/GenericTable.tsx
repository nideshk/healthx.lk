"use client";

import React from "react";
import { Loader2 } from "lucide-react";

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
}

const GenericTable = <T extends { id: string | number }>({
  columns,
  data,
  loading,
  minWidth = "1400px",
}: GenericTableProps<T>) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center rounded-2xl">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      )}
      <div className="overflow-x-auto max-h-[500px]">
        <table className={`min-w-[${minWidth}] w-full text-sm`}>
          <thead className="bg-blue-600 text-white sticky top-0 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 text-left font-semibold ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-3 ${col.className || ""}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              !loading && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-10 text-slate-400 italic">
                    No records found for the selected period.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GenericTable;