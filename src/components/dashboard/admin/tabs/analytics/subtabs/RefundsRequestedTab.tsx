"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";
import GenericTable, { Column } from "./GenericTable"; // Adjust path as needed
import { ChevronLeft, ChevronRight } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type RefundItem = {
  id: string;
  transactionId: string;
  requestedDate: string;
  patientName: string;
  email: string;
  phone: string;
  appointmentDate: string;
  doctor: string;
  amount: number;
  reason: string;
  status: "Pending" | "refunded" | "rejected";
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const RefundsRequestedTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate()
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate()
  );
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [actionType, setActionType] = useState<"mark_refunded" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  /* -------------------------------------------------------------------------- */
  /* API CALLS                                   */
  /* -------------------------------------------------------------------------- */

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/refunds");
      const data = await response.json();

      if (data.status === "success") {
        const apiRefunds = data.refunds.map((ref: any) => ({
          id: ref.refund_id || ref.id,
          transactionId: ref.transaction_id || "N/A",
          requestedDate: ref.requested_at || ref.requestedDate || "",
          patientName: ref.patient_name || ref.patientName || "Unknown",
          email: ref.email || "",
          phone: ref.phone || "",
          appointmentDate: ref.appointment_date || ref.appointmentDate || "",
          doctor: ref.doctor_name || ref.doctor || "",
          amount: ref.amount || 0,
          reason: ref.reason || "",
          status: ref.status,
        }));
        setRefunds(apiRefunds);
      } else {
        toast.error("Failed to load refunds");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Unable to connect to refund service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [fromDate, toDate]);

  const processRefundAction = async () => {
    if (!selectedRefund || !actionType) return;

    try {
      const response = await fetch("http://localhost:3000/api/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_id: selectedRefund.id,
          action: actionType,
          admin_note: adminNote,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Refund successfully ${result.status}`);
        setModalOpen(false);
        setAdminNote("");
        fetchRefunds();
      } else {
        toast.error("Operation failed");
      }
    } catch (error) {
      toast.error("Error updating refund status");
    }
  };

  const openConfirmation = (item: RefundItem, type: "mark_refunded" | "reject") => {
    setSelectedRefund(item);
    setActionType(type);
    setModalOpen(true);
  };

  /* -------------------------------------------------------------------------- */
  /* PAGINATION LOGIC                             */
  /* -------------------------------------------------------------------------- */

  const totalPages = Math.ceil(refunds.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return refunds.slice(start, start + rowsPerPage);
  }, [refunds, currentPage]);

  /* -------------------------------------------------------------------------- */
  /* TABLE COLUMNS CONFIG                         */
  /* -------------------------------------------------------------------------- */

  const columns: Column<RefundItem>[] = [
    { header: "Requested Date", render: (item) => item.requestedDate },
    { header: "Patient Name", render: (item) => <span className="font-medium">{item.patientName}</span> },
    { header: "Email", render: (item) => item.email, className: "min-w-[220px]" },
    { header: "Phone", render: (item) => item.phone },
    { header: "Appointment Date", render: (item) => item.appointmentDate },
    { header: "Transaction ID", render: (item) => <span className="font-mono text-xs text-slate-500">{item.transactionId}</span> },
    { header: "Doctor", render: (item) => item.doctor },
    { header: "Refund Amount", render: (item) => `LKR ${item.amount.toLocaleString()}`, className: "font-medium" },
    { header: "Reason", render: (item) => item.reason, className: "min-w-[200px]" },
    { header: "Status", render: (item) => <StatusBadge status={item.status} /> },
    {
      header: "Actions",
      render: (item) => (
        item.status === "Pending" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openConfirmation(item, "mark_refunded")}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => openConfirmation(item, "reject")}>Reject</Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic capitalize">{item.status}</span>
        )
      )
    },
  ];

  return (
    <div className="space-y-4">
      {/* ---------------- DATE FILTER ---------------- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input type="date" label="From Date" value={fromDate ?? ""} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" label="To Date" value={toDate ?? ""} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* ---------------- GENERIC TABLE ---------------- */}
      <GenericTable 
        columns={columns} 
        data={paginatedData} 
        loading={loading} 
        minWidth="1200px" 
      />

      {/* ---------------- PAGINATION CONTROLS ---------------- */}
      {!loading && refunds.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4 bg-white border border-slate-200 rounded-2xl">
          <span className="text-xs text-slate-500">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, refunds.length)} of {refunds.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                    currentPage === idx + 1 ? "bg-blue-600 text-white" : "hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ---------------- CONFIRMATION MODAL ---------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 capitalize">
              {actionType === "mark_refunded" ? "Approve Refund" : "Reject Refund Request"}
            </h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to {actionType === "mark_refunded" ? "approve" : "reject"} the refund of 
              <span className="font-bold text-slate-800"> LKR {selectedRefund?.amount.toLocaleString()}</span> for 
              <span className="font-bold text-slate-800"> {selectedRefund?.patientName}</span>?
            </p>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Admin Note (Optional)</label>
              <textarea 
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                placeholder="Enter reason or bank transfer details..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${
                  actionType === "mark_refunded" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={processRefundAction}
              >
                Confirm {actionType === "mark_refunded" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsRequestedTab;

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                  */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: RefundItem["status"] }) => {
  const map = {
    Pending: "bg-orange-100 text-orange-700",
    refunded: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${map[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
};