"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import GenericTable, { Column } from "./GenericTable"; // Adjust path as needed
import { authFetch } from "@/lib/authFetch";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type RefundItem = {
  id: string;
  transaction_id: string | number;
  created_at: string;
  patient_name: string;
  email: string;
  appointment_start: string;
  refund_amount: number;
  currency: string;
  reason: string;
  status: string;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

const RefundsRequestedTab: React.FC = () => {
  // Filter States
  const [fromDate, setFromDate] = useState<string>(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState<string>(
    DateTime.now().endOf("month").toISODate() || ""
  );

  // Data States
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Action States (Modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundItem | null>(null);
  const [actionType, setActionType] = useState<"mark_refunded" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  /* -------------------------------------------------------------------------- */
  /* API CALLS                                  */
  /* -------------------------------------------------------------------------- */

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/refunds");

      if (!response.ok) {
          throw new Error(`Failed to fetch refunds: ${response.status}`);
        }
      const data = await response.json();

      if (data.status === "success") {
        const mappedData: RefundItem[] = data.refunds.map((item: any) => ({
          id: item.id,
          transaction_id: item.transaction_id,
          created_at: item.created_at,
          patient_name: item.patient?.full_name || "N/A",
          email: item.patient?.email || "N/A",
          appointment_start: item.appointment?.starts_at || "",
          refund_amount: item.refund_amount || 0,
          currency: item.currency || "LKR",
          reason: item.reason || "N/A",
          status: item.status, 
        }));

        setRefunds(mappedData);
      } else {
        toast.error("Failed to fetch refund records");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Network error: Could not load refunds");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleProcessAction = async () => {
    if (!selectedRefund || !actionType) return;

    try {
      const response = await authFetch("/api/refunds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_id: selectedRefund.id,
          action: actionType,
          admin_note: adminNote,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process refund action: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Refund successfully ${result.status}`);
        setModalOpen(false);
        setAdminNote("");
        fetchRefunds(); // Refresh list to reflect changes
      } else {
        toast.error("Action failed. Please try again.");
      }
    } catch (error) {
      toast.error("Network error: Failed to process refund action");
    }
  };

  const openConfirmation = (item: RefundItem, type: "mark_refunded" | "reject") => {
    setSelectedRefund(item);
    setActionType(type);
    setModalOpen(true);
  };

  /* -------------------------------------------------------------------------- */
  /* TABLE CONFIGURATION                             */
  /* -------------------------------------------------------------------------- */

  const columns: Column<RefundItem>[] = [
    {
      header: "Requested On",
      render: (item) => DateTime.fromISO(item.created_at).toFormat("yyyy-MM-dd HH:mm"),
      className: "whitespace-nowrap",
    },
    {
      header: "Patient Details",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{item.patient_name}</span>
          <span className="text-xs text-slate-500">{item.email}</span>
        </div>
      ),
    },
    {
      header: "Appt. Date",
      render: (item) =>
        item.appointment_start
          ? DateTime.fromISO(item.appointment_start).toFormat("yyyy-MM-dd")
          : "N/A",
    },
    {
      header: "TXN ID",
      render: (item) => (
        <span className="font-mono text-blue-600 font-bold">{item.transaction_id}</span>
      ),
    },
    {
      header: "Amount",
      render: (item) => (
        <span className="font-bold text-slate-900">
          {item.currency} {item.refund_amount.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Reason",
      render: (item) => (
        <span className="text-[10px] uppercase font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
          {item.reason.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      className: "text-right",
      render: (item) => (
        item.status === "requested" ? (
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => openConfirmation(item, "mark_refunded")}>
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => openConfirmation(item, "reject")}>
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic capitalize">{item.status}</span>
        )
      ),
    },
  ];

  // Pagination Logic
  const totalPages = Math.ceil(refunds.length / limit) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    return refunds.slice(start, start + limit);
  }, [refunds, page, limit]);

  return (
    <div className="space-y-4">
      {/* ---------------- FILTERS ---------------- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          type="date"
          label="From Date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* ---------------- GENERIC TABLE ---------------- */}
      <GenericTable
        columns={columns}
        data={paginatedData}
        loading={loading}
        minWidth="1200px"
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          totalResults: refunds.length,
          perPage: limit,
          onPageChange: (p) => setPage(p),
          onLimitChange: (l) => {
            setLimit(l);
            setPage(1);
          },
        }}
      />

      {/* ---------------- CONFIRMATION MODAL ---------------- */}
      {modalOpen && selectedRefund && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800">
              {actionType === "mark_refunded" ? "Approve Refund" : "Reject Refund Request"}
            </h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to {actionType === "mark_refunded" ? "approve" : "reject"} the refund of{" "}
              <span className="font-bold text-slate-900">
                {selectedRefund.currency} {selectedRefund.refund_amount.toLocaleString()}
              </span>{" "}
              for <span className="font-bold text-slate-900">{selectedRefund.patient_name}</span>?
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                Admin Note (Optional)
              </label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Enter details for this action..."
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 py-2.5 text-sm font-medium bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                  actionType === "mark_refunded"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                onClick={handleProcessAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* STATUS BADGE                                */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase();
  const styles: Record<string, string> = {
    requested: "bg-amber-100 text-amber-700 border-amber-200",
    refunded: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  const currentStyle = styles[s] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${currentStyle}`}
    >
      {status}
    </span>
  );
};

export default RefundsRequestedTab;