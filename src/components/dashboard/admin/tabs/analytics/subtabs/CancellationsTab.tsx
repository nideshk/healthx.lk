"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { X } from "lucide-react";
import GenericTable, { Column } from "./GenericTable";
import { start } from "repl";
import { authFetch } from "@/lib/authFetch";

type CancellationItem = {
  id: string;
  // cancellationDate: string;
  appointmentDate: string;
  Time?: string;
  patientName: string;
  email: string;
  paymentStatus: string;
  appointmentType: string;
  doctor: string;
  docEmail: string;
  notes:string;
  transactionId: string;
  reason: string;
  refundEligible: boolean;
  status: string;
};

const CancellationsTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate() || ""
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const [data, setData] = useState<CancellationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CancellationItem | null>(
    null
  );

  const fetchCancellations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(
        `/api/booking?from=${fromDate}&to=${toDate}&type=cancelled&page=${currentPage}&per_page=${perPage}`
      );

      if (!response.ok) {
          throw new Error(`Failed to fetch cancellations: ${response.status}`);
        }

      const data = await response.json();

      if (data.success) {
        const mappedData = data.data.map((item: any) => ({
          id: item.id,
          cancellationDate: item.appointment_date,
          appointmentDate: item.appointment_date,
          // FIX: Added optional chaining to handle null patients
          patientName: item.patient?.name || "N/A",
          email: item.patient?.email || "No email provided",
          doctor: item.practitioner?.name || "Unknown Doctor",
          docEmail: item.practitioner?.email || "No email provided",
          Time: item.start_time + " - " + item.end_time,
          transactionId: item.id.split("-")[0].toUpperCase(),
          paymentStatus: item.payment_status || "unknown",
          appointmentType: item.appointment_type || "N/A",
          reason: item.cancellation_reason || "No reason provided",
          refundEligible: item.payment_status === "paid",
          status:item.status,
          notes :item.notes || "No notes provided",
        }));
        setData(mappedData);
        setTotalPages(data.meta.total_pages || 1);
        setTotalResults(data.meta.total || 0);
      }
    } catch (error) {
      console.error("Error fetching cancellations:", error);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, currentPage, perPage]);

  useEffect(() => {
    fetchCancellations();
  }, [fetchCancellations]);

  const columns: Column<CancellationItem>[] = [
    {
      header: "Appointment Date & Time",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-700">
            {item.appointmentDate}
          </div>
          <div className="text-xs text-slate-500">
            {item.Time} 
          </div>
        </div>
      ),
    },
    {
      header: "Patient",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-700">{item.patientName}</div>
          <div className="text-xs text-slate-500">{item.email}</div>
        </div>
      ),
    },
    {
      header: "Doctor",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-700">{item.doctor}</div>
          <div className="text-xs text-slate-500">{item.docEmail}</div>
        </div>
      ),
    },
    {
      header: "Appointment Type",
      render: (item) => item.appointmentType,
    },
     {
      header: "Cancellation Reason",
      render: (item) => item.reason,
    },
    {
       header: "Appointment reason",
       render: (item) => item.notes,
     },
    {
      header: "Status",
      render: (item) => (
        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
          {item.status}
        </span>
      ),
    },
   {
  header: "Payment Status",
  render: (item) => {
    const isPaid = item.paymentStatus?.toLowerCase() === "paid";
    return (
      <span
        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isPaid 
            ? "bg-green-100 text-green-700" 
            : "bg-red-100 text-red-700"
        }`}
      >
        {item.paymentStatus || "N/A"}
      </span>
    );
  },
},
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="date"
            label="From Date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Input
            type="date"
            label="To Date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <GenericTable
        columns={columns}
        data={data}
        loading={loading}
        minWidth="800px"
        pagination={{
          currentPage,
          totalPages,
          totalResults,
          perPage,
          onPageChange: (page) => setCurrentPage(page),
          onLimitChange: (limit) => {
            setPerPage(limit);
            setCurrentPage(1);
          },
        }}
      />

    </div>
  );
};


export default CancellationsTab;
