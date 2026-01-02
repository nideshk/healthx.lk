"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
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
  status: "Pending" | "Approved" | "Rejected";
};

/* -------------------------------------------------------------------------- */
/*                                MOCK DATA                                   */
/* -------------------------------------------------------------------------- */

const MOCK_REFUNDS: RefundItem[] = [
  {
    id: "r1",
    transactionId: "TXN-902341",
    requestedDate: "2024-02-05",
    patientName: "John Doe",
    email: "john.doe@email.com",
    phone: "077-123-4567",
    appointmentDate: "2024-02-01",
    doctor: "Dr. Sarah Wilson",
    amount: 3500,
    reason: "Appointment cancelled",
    status: "Pending",
  },
  {
    id: "r2",
    transactionId: "TXN-902349",
    requestedDate: "2024-02-10",
    patientName: "Alice Brown",
    email: "alice.brown@email.com",
    phone: "077-456-7890",
    appointmentDate: "2024-02-07",
    doctor: "Dr. Michael Chen",
    amount: 5000,
    reason: "Doctor unavailable",
    status: "Approved",
  },
  {
    id: "r3",
    transactionId: "TXN-902355",
    requestedDate: "2024-02-12",
    patientName: "Eva Martinez",
    email: "eva.martinez@email.com",
    phone: "077-678-9012",
    appointmentDate: "2024-02-09",
    doctor: "Dr. Sarah Wilson",
    amount: 3500,
    reason: "Payment issue",
    status: "Rejected",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const RefundsRequestedTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate()
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate()
  );
  const [refunds, setRefunds] = useState<RefundItem[]>([]);

  useEffect(() => {
    /**
     * FUTURE API:
     * GET /api/admin/analytics/refunds
     * params: { fromDate, toDate }
     */
    setRefunds(MOCK_REFUNDS);
  }, [fromDate, toDate]);

  const handleApprove = (item: RefundItem) => {
    console.log("Approve refund:", item);
  };

  const handleReject = (item: RefundItem) => {
    console.log("Reject refund:", item);
  };

  return (
    <div className="space-y-4">

      {/* ---------------- DATE FILTER ---------------- */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input type="date" label="From Date" value={fromDate ?? ""} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" label="To Date" value={toDate ?? ""} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {/* ---------------- TABLE (SCROLLABLE) ---------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl">
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
              {refunds.map((item) => (
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
                        <Button size="sm" onClick={() => handleApprove(item)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleReject(item)}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RefundsRequestedTab;

/* -------------------------------------------------------------------------- */
/*                              STATUS BADGE                                  */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: RefundItem["status"] }) => {
  const map = {
    Pending: "bg-orange-100 text-orange-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs whitespace-nowrap ${map[status]}`}>
      {status}
    </span>
  );
};
