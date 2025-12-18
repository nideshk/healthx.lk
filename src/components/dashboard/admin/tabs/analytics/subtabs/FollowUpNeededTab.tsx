"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type FollowUpItem = {
  id: string;
  completedDate: string;
  patientName: string;
  email: string;
  phone: string;
  followUpDate: string;
  doctor: string;
  comments?: string;
};

/* -------------------------------------------------------------------------- */
/*                                MOCK DATA                                   */
/* -------------------------------------------------------------------------- */

const MOCK_DATA: FollowUpItem[] = [
  {
    id: "1",
    completedDate: "2024-01-15",
    patientName: "John Doe",
    email: "john.doe@email.com",
    phone: "077-123-4567",
    followUpDate: "2024-02-15",
    doctor: "Dr. Sarah Wilson",
  },
  {
    id: "2",
    completedDate: "2024-01-18",
    patientName: "Alice Brown",
    email: "alice.brown@email.com",
    phone: "077-456-7890",
    followUpDate: "2024-02-18",
    doctor: "Dr. Sarah Wilson",
    comments: "Patient requires blood pressure monitoring",
  },
  {
    id: "3",
    completedDate: "2024-01-20",
    patientName: "Eva Martinez",
    email: "eva.martinez@email.com",
    phone: "077-678-9012",
    followUpDate: "2024-02-20",
    doctor: "Dr. Michael Chen",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const FollowUpNeededTab: React.FC = () => {
  /* ---------------- DEFAULT CURRENT MONTH ---------------- */
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate()
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate()
  );

  const [data, setData] = useState<FollowUpItem[]>([]);

  /* ---------------- FETCH (MOCK / API READY) ---------------- */
  useEffect(() => {
    /**
     * FUTURE API:
     * GET /api/admin/analytics/follow-ups
     * params: { fromDate, toDate }
     */
    setData(MOCK_DATA);
  }, [fromDate, toDate]);

  /* ---------------- ACTION ---------------- */
  const handleNotify = (item: FollowUpItem) => {
    /**
     * FUTURE API:
     * POST /api/admin/follow-ups/notify
     * body: { followUpId: item.id }
     */
    console.log("Notify patient:", item);
  };

  return (
    <div className="space-y-4">

      {/* ------------------------------------------------ */}
      {/* DATE FILTER                                      */}
      {/* ------------------------------------------------ */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          type="date"
          label="From Date"
          value={fromDate ?? ""}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate ?? ""}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {/* ------------------------------------------------ */}
      {/* TABLE                                           */}
      {/* ------------------------------------------------ */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Completed Date</th>
              <th className="px-4 py-3 text-left">Patient Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Follow-up Required</th>
              <th className="px-4 py-3 text-left">Doctor</th>
              <th className="px-4 py-3 text-left">Comments</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  {item.completedDate}
                </td>
                <td className="px-4 py-3 font-medium">
                  {item.patientName}
                </td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.phone}</td>

                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                    {item.followUpDate}
                  </span>
                </td>

                <td className="px-4 py-3">{item.doctor}</td>

                <td className="px-4 py-3 text-slate-500 italic">
                  {item.comments ?? "Add comment..."}
                </td>

                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    onClick={() => handleNotify(item)}
                  >
                    Notify
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FollowUpNeededTab;
