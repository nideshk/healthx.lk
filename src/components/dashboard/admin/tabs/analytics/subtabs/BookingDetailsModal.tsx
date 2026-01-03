"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import Button from "@/components/atom/Button/Button";

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

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, type, fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/booking?from=${fromDate}&to=${toDate}&type=${type}&page=1&per_page=50`
      );
      const json = await response.json();
      if (json.success) {
        setData(json.data);
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {type} Bookings
            </h3>
            <p className="text-xs text-slate-500">
              Showing records from {fromDate} to {toDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 text-sm">Fetching records...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No records found for this period.
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
                        <div className="font-medium">{item.appointment_date}</div>
                        <div className="text-xs text-slate-500">
                          {item.start_time} - {item.end_time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {item.patient.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.patient.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{item.practitioner.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-600">{item.appointment_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
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

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;