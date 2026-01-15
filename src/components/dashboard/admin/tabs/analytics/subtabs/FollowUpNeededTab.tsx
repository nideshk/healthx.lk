"use client";

import React, { useEffect, useState } from "react";
import { DateTime } from "luxon";
import Input from "@/components/atom/Input/Input";
import Button from "@/components/atom/Button/Button";
import { CheckCircle, XCircle } from "lucide-react";
import GenericTable, { Column } from "./GenericTable";
import { authFetch } from "@/lib/authFetch";

/* -------------------------------------------------------------------------- */
/* TYPES                                    */
/* -------------------------------------------------------------------------- */

type FollowUpItem = {
  id: string;
  patientName: string;
  email: string;
  followUpDate: string;
  followUpTime: string; // Added field for time
  doctor: string;
  comments?: string;
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

const FollowUpNeededTab: React.FC = () => {
  /* ---------------- STATE ---------------- */
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);

  /* ---------------- TABLE COLUMNS ---------------- */
  const columns: Column<FollowUpItem>[] = [
    {
      header: "Patient Name",
      render: (item) => <span className="font-medium">{item.patientName}</span>,
    },
    {
      header: "Email",
      render: (item) => item.email,
    },
    {
      header: "Follow-up Date",
      render: (item) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
          {item.followUpDate}
        </span>
      ),
    },
    {
      header: "Follow-up Time", // New Column
      render: (item) => (
        <span className="text-slate-600 font-medium">
          {item.followUpTime}
        </span>
      ),
    },
    {
      header: "Doctor",
      render: (item) => item.doctor,
    },
    {
      header: "Comments",
      render: (item) => (
        <span className="text-slate-500 italic">
          {item.comments ?? "Add comment..."}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (item) => (
        <Button size="sm" onClick={() => handleNotify(item)}>
          Notify
        </Button>
      ),
    },
  ];

  /* ---------------- FETCH FOLLOW UPS ---------------- */
  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        setLoading(true);

        const queryParams = new URLSearchParams({
          from: fromDate || "",
          to: toDate || "",
          page: currentPage.toString(),
          limit: perPage.toString(),
        });

        const res = await authFetch(`/api/encounter/follow-up?${queryParams}`, {
          credentials: "include",
        });

       if (!res.ok) {
          throw new Error(`Failed to fetch follow-up data: ${res.status}`);
        }

        const data = await res.json();

        const mapped: FollowUpItem[] = (data.items || []).map((item: any) => {
          const dt = DateTime.fromISO(item.follow_up_date);
          
          return {
            id: item.encounter_id,
            patientName: item.patient?.name ?? "-",
            email: item.patient?.email ?? "-",
            followUpDate: dt.toFormat("yyyy-MM-dd"),
            followUpTime: dt.toFormat("hh:mm a"), 
            doctor: item.doctor ?? "-",
            comments:
              item.follow_up_comments ?? item.clinician_notes ?? undefined,
          };
        });

        setData(mapped);
        setTotalResults(data.total || mapped.length);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, [fromDate, toDate, currentPage, perPage]);

  /* ---------------- ACTION ---------------- */
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

      setToastMessage(json.message || "Follow-up notified successfully");
      setToastType("success");
      setShowToast(true);

      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error(err);
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
          onChange={(e) => {
            setFromDate(e.target.value);
            setCurrentPage(1);
          }}
        />
        <Input
          type="date"
          label="To Date"
          value={toDate ?? ""}
          onChange={(e) => {
            setToDate(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ------------------------------------------------ */}
      {/* GENERIC TABLE IMPLEMENTATION                    */}
      {/* ------------------------------------------------ */}
      <GenericTable
        columns={columns}
        data={data}
        loading={loading}
        minWidth="1200px" // Slightly increased to fit the new column
        pagination={{
          currentPage,
          totalPages: Math.ceil(totalResults / perPage) || 1,
          totalResults,
          perPage,
          onPageChange: (page) => setCurrentPage(page),
          onLimitChange: (limit) => {
            setPerPage(limit);
            setCurrentPage(1);
          },
        }}
      />

      {/* ------------------------------------------------ */}
      {/* TOAST NOTIFICATION                               */}
      {/* ------------------------------------------------ */}
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