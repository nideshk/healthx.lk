"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { CheckCircle, XCircle } from "lucide-react";


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
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const FollowUpNeededTab: React.FC = () => {
  /* ---------------- DATE FILTER (UI ONLY for now) ---------------- */

  
const [showToast, setShowToast] = useState(false);
const [toastMessage, setToastMessage] = useState("");
const [toastType, setToastType] = useState<"success" | "error">("success");

  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate()
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate()
  );

  const [data, setData] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- FETCH FOLLOW UPS ---------------- */
  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/encounter/follow-up", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch follow-up data");
        }

        const json = await res.json();

        const mapped: FollowUpItem[] = (json.items || []).map((item: any) => ({
          id: item.encounter_id,
          completedDate: DateTime.fromISO(item.completed_date).toFormat(
            "yyyy-MM-dd"
          ),
          patientName: item.patient?.name ?? "-",
          email: item.patient?.email ?? "-",
          phone: "-", // ❌ API does not provide phone
          followUpDate: DateTime.fromISO(item.follow_up_date).toFormat(
            "yyyy-MM-dd"
          ),
          doctor: item.doctor ?? "-",
          comments:
            item.follow_up_comments ??
            item.clinician_notes ??
            undefined,
        }));

        setData(mapped);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, [fromDate, toDate]);

  /* ---------------- ACTION (PATCH API LATER) ---------------- */
 const handleNotify = async (item: FollowUpItem) => {
  try {
    const res = await fetch("/api/encounter/follow-up", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        encounter_id: item.id,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to notify follow-up");
    }

    const json = await res.json();

    // ✅ Show success toast from API message
    setToastMessage(json.message || "Follow-up notified successfully");
    setToastType("success");
    setShowToast(true);

    setTimeout(() => setShowToast(false), 3000);
  } catch (err) {
    console.error(err);

    // ❌ Error toast
    setToastMessage("Unable to notify follow-up");
    setToastType("error");
    setShowToast(true);

    setTimeout(() => setShowToast(false), 3000);
  }
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
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Loading follow-ups...
                </td>
              </tr>
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No follow-ups found.
                </td>
              </tr>
            )}

            {data.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-3">{item.completedDate}</td>

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
                  <Button size="sm" onClick={() => handleNotify(item)}>
                    Notify
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showToast && (
  <div
    className={`fixed bottom-5 right-5 z-50 border shadow-lg rounded-md flex items-center gap-2 px-4 py-2 text-xs animate-fadeIn
      ${
        toastType === "success"
          ? "bg-white text-gray-700 border-green-200"
          : "bg-white text-red-700 border-red-200"
      }
    `}
  >
    {toastType === "success" ? (
      <CheckCircle size={14} className="text-green-600" />
    ) : (
      <XCircle size={14} className="text-red-600" />
    )}
    <span>{toastMessage}</span>
  </div>
)}
    </div>
);
};

export default FollowUpNeededTab;
