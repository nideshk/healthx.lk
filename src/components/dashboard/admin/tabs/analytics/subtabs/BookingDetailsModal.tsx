"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/atom/Button/Button";
import { authFetch } from "@/lib/authFetch";

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "total" | "upcoming" | "completed" | "cancelled";
  fromDate: string;
  toDate: string;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  isOpen,
  onClose,
  type,
  fromDate,
  toDate,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 10;

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      // Reset page when modal closes so it starts at 1 next time
      setCurrentPage(1);
    }
  }, [isOpen, type, fromDate, toDate, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await authFetch(
        `/api/booking?from=${fromDate}&to=${toDate}&type=${type}&page=${currentPage}&per_page=${perPage}`
      );
      if (!response.ok) {
          throw new Error(`Failed to fetch booking details: ${response.status}`);
        }

      const data = await response.json();
      
      if (data.success) {
        setData(data.data);
        setTotalPages(data.meta.total_pages || 1);
        setTotalItems(data.meta.total || 0);
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {type} Bookings
            </h3>
            <p className="text-xs text-slate-500">
              {totalItems} records found • {fromDate} to {toDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 text-sm">Loading page {currentPage}...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No records found for this selection.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Practitioner</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{item.appointment_date}</div>
                        <div className="text-xs text-slate-500">{item.start_time}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.patient.name}</div>
                        <div className="text-xs text-slate-400">{item.patient.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.practitioner.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.appointment_type}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER WITH PAGINATION */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page <span className="font-medium text-slate-700">{currentPage}</span> of{" "}
            <span className="font-medium text-slate-700">{totalPages}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} className="text-slate-600" />
              </button>
              <button
                disabled={currentPage === totalPages || loading}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="p-2 border rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} className="text-slate-600" />
              </button>
            </div>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;