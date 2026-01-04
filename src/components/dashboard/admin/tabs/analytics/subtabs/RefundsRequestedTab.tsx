"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { toast } from "react-toastify";

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
  status: "Pending" | "refunded" | "rejected"; // Aligned with API responses
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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [actionType, setActionType] = useState<"mark_refunded" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  /* -------------------------------------------------------------------------- */
  /* API CALLS                                   */
  /* -------------------------------------------------------------------------- */

  // API 37: Fetch Refunds
  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/refunds");
      const data = await response.json();

      if (data.status === "success") {
        // Mapping API fields to our UI RefundItem type
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

  // API 38: PATCH Action
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
        fetchRefunds(); // Refresh the table
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

  return (
    <div className="space-y-4">
      {/* ---------------- DATE FILTER ---------------- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input type="date" label="From Date" value={fromDate ?? ""} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" label="To Date" value={toDate ?? ""} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* ---------------- TABLE (SCROLLABLE) ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Requested Date</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Patient Name</th>
                <th className="px-4 py-3 text-left min-w-[220px]">Email</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Appointment Date</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Transaction ID</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Doctor</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Refund Amount</th>
                <th className="px-4 py-3 text-left min-w-[200px]">Reason</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-500">Loading refunds...</td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-slate-400">No refund requests found.</td>
                </tr>
              ) : (
                refunds.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">{item.requestedDate}</td>
                    <td className="px-4 py-3 font-medium">{item.patientName}</td>
                    <td className="px-4 py-3">{item.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.appointmentDate}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.transactionId}</td>
                    <td className="px-4 py-3">{item.doctor}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      LKR {item.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{item.reason}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "Pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => openConfirmation(item, "mark_refunded")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openConfirmation(item, "reject")}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic capitalize">{item.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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