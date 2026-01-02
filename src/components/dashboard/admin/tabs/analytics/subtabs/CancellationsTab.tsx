"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type CancellationItem = {
  id: string;
  cancellationDate: string;
  appointmentDate: string;
  patientName: string;
  email: string;
  phone: string;
  doctor: string;
  transactionId: string;
  cancellationType: "Patient" | "Doctor" | "Admin";
  reason: string;
  refundEligible: boolean;
  refundAmount?: number;
  status: "Cancelled" | "Refunded" | "No Refund";
  cancelledBy: string;
  createdAt: string;
};

/* -------------------------------------------------------------------------- */
/*                                MOCK DATA                                   */
/* -------------------------------------------------------------------------- */

const MOCK_CANCELLATIONS: CancellationItem[] = [
  {
    id: "c1",
    cancellationDate: "2024-02-06",
    appointmentDate: "2024-02-08",
    patientName: "John Doe",
    email: "john.doe@email.com",
    phone: "077-123-4567",
    doctor: "Dr. Sarah Wilson",
    transactionId: "TXN-912301",
    cancellationType: "Patient",
    reason: "Personal emergency",
    refundEligible: true,
    refundAmount: 3500,
    status: "Refunded",
    cancelledBy: "System",
    createdAt: "2024-02-06 10:45 AM",
  },
  {
    id: "c2",
    cancellationDate: "2024-02-11",
    appointmentDate: "2024-02-11",
    patientName: "Alice Brown",
    email: "alice.brown@email.com",
    phone: "077-456-7890",
    doctor: "Dr. Michael Chen",
    transactionId: "TXN-912319",
    cancellationType: "Doctor",
    reason: "Doctor unavailable",
    refundEligible: true,
    refundAmount: 5000,
    status: "Cancelled",
    cancelledBy: "Admin – Nidesh",
    createdAt: "2024-02-11 08:10 AM",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const CancellationsTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate()
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate()
  );

  const [cancellations, setCancellations] =
    useState<CancellationItem[]>([]);

  const [selected, setSelected] =
    useState<CancellationItem | null>(null);

  useEffect(() => {
    setCancellations(MOCK_CANCELLATIONS);
  }, [fromDate, toDate]);

  return (
    <>
      <div className="space-y-4">
        {/* DATE FILTER */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input type="date" label="From Date" value={fromDate ?? ""} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" label="To Date" value={toDate ?? ""} onChange={(e) => setToDate(e.target.value)} />
        </div>

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl">
          <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
            <table className="min-w-[1300px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">Cancellation Date</th>
                  <th className="px-4 py-3 text-left">Appointment Date</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Doctor</th>
                  <th className="px-4 py-3 text-left">Transaction ID</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Refund Eligible</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {cancellations.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap">{item.cancellationDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{item.appointmentDate}</td>
                    <td className="px-4 py-3">{item.patientName}</td>
                    <td className="px-4 py-3">{item.doctor}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.transactionId}</td>
                    <td className="px-4 py-3">{item.cancellationType}</td>
                    <td className="px-4 py-3">{item.refundEligible ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selected && (
        <CancellationDetailsModal
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default CancellationsTab;

/* -------------------------------------------------------------------------- */
/*                              DETAILS MODAL                                 */
/* -------------------------------------------------------------------------- */

const CancellationDetailsModal = ({
  data,
  onClose,
}: {
  data: CancellationItem;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4">
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold mb-1">Cancellation Details</h2>
        <p className="text-xs text-slate-500 mb-4">
          Transaction ID: <span className="font-mono">{data.transactionId}</span>
        </p>

        <div className="space-y-3 text-sm">
          <Detail label="Patient" value={data.patientName} />
          <Detail label="Doctor" value={data.doctor} />
          <Detail label="Appointment Date" value={data.appointmentDate} />
          <Detail label="Cancellation Date" value={data.cancellationDate} />
          <Detail label="Cancellation Type" value={data.cancellationType} />
          <Detail label="Cancelled By" value={data.cancelledBy} />
          <Detail label="Refund Eligible" value={data.refundEligible ? "Yes" : "No"} />
          {data.refundEligible && (
            <Detail label="Refund Amount" value={`LKR ${data.refundAmount}`} />
          )}
          <Detail label="Status" value={data.status} />
          <Detail label="Reason" value={data.reason} multiline />
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              HELPERS                                       */
/* -------------------------------------------------------------------------- */

const Detail = ({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | number;
  multiline?: boolean;
}) => (
  <div className="flex gap-2">
    <div className="w-40 text-slate-500">{label}</div>
    <div className={multiline ? "text-slate-700" : "font-medium"}>
      {value}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: CancellationItem["status"] }) => {
  const map = {
    Cancelled: "bg-orange-100 text-orange-700",
    Refunded: "bg-green-100 text-green-700",
    "No Refund": "bg-slate-200 text-slate-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${map[status]}`}>
      {status}
    </span>
  );
};
