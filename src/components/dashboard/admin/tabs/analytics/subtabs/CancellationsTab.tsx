"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type CancellationItem = {
  id: string;
  cancellationDate: string;
  appointmentDate: string;
  patientName: string;
  email: string;
  doctor: string;
  transactionId: string;
  reason: string;
  refundEligible: boolean;
  status: string;
};

const CancellationsTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(DateTime.now().startOf("month").toISODate() || "");
  const [toDate, setToDate] = useState(DateTime.now().endOf("month").toISODate() || "");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  const [data, setData] = useState<CancellationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CancellationItem | null>(null);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/booking?from=${fromDate}&to=${toDate}&type=cancelled&page=${currentPage}&per_page=${perPage}`
      );
      const json = await response.json();

      if (json.success) {
        const mappedData = json.data.map((item: any) => ({
          id: item.id,
          cancellationDate: item.appointment_date,
          appointmentDate: item.appointment_date,
          patientName: item.patient.name,
          email: item.patient.email,
          doctor: item.practitioner.name,
          transactionId: item.id.split("-")[0].toUpperCase(),
          reason: item.cancellation_reason || "No reason provided",
          refundEligible: item.payment_status === "paid",
          status: "Cancelled",
        }));
        setData(mappedData);
        setTotalPages(json.meta.total_pages || 1);
      }
    } catch (error) {
      console.error("Error fetching cancellations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, [fromDate, toDate, currentPage]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="date" label="From Date" value={fromDate} onChange={(e) => {setFromDate(e.target.value); setCurrentPage(1);}} />
          <Input type="date" label="To Date" value={toDate} onChange={(e) => {setToDate(e.target.value); setCurrentPage(1);}} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-4 py-3">Cancellation Date</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2 text-blue-600" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500">No records found.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{item.cancellationDate}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{item.patientName}</div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                    </td>
                    <td className="px-4 py-3">{item.doctor}</td>
                    <td className="px-4 py-3">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">{item.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setSelectedItem(item)}>View</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="px-4 py-3 bg-slate-50 border-t flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-1 rounded border bg-white disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-1 rounded border bg-white disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedItem && <DetailModal data={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};

const DetailModal = ({ data, onClose }: { data: CancellationItem; onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Details</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="space-y-3 text-sm">
        <p><strong>Patient:</strong> {data.patientName}</p>
        <p><strong>Doctor:</strong> {data.doctor}</p>
        <p><strong>Reason:</strong> {data.reason}</p>
        <p><strong>Refund Eligible:</strong> {data.refundEligible ? "Yes" : "No"}</p>
      </div>
      <Button className="mt-6 w-full" onClick={onClose}>Close</Button>
    </div>
  </div>
);

export default CancellationsTab;