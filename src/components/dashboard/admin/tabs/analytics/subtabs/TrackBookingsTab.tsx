"use client";

import React, { useState, useEffect } from "react";
import { DateTime } from "luxon";
import StatCard from "../subtabs/StatCard";
import RevenueBreakdownModal from "../subtabs/RevenueBreakdownModal";
import GenericTable, { Column } from "../subtabs/GenericTable";
import Input from "@/components/atom/Input/Input";
import { XCircle } from "lucide-react";

const TrackBookingsTab: React.FC = () => {
  const [fromDate, setFromDate] = useState(
    DateTime.now().startOf("month").toISODate() || ""
  );
  const [toDate, setToDate] = useState(
    DateTime.now().endOf("month").toISODate() || ""
  );

  const [stats, setStats] = useState({
    total_bookings: 0,
    completed: 0,
    upcoming: 0,
    totalRevenue: 0,
  });

  const [revenueBreakdown, setRevenueBreakdown] = useState({
    totalPlatformFees: 0,
    totalConsultationFees: 0,
    totalServiceFees: 0,
    totalTaxes: 0,
  });

  const [showRevenueModal, setShowRevenueModal] = useState(false);

  // --- NEW LIST VIEW STATES ---
  const [activeListView, setActiveListView] = useState<"total" | "upcoming" | "completed" | "cancelled" | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Original Fetch Logic for Cards
  const fetchData = async () => {
    try {
      const summaryRes = await fetch(
        `http://localhost:3000/api/booking/summary?from=${fromDate}&to=${toDate}`
      );
      const summaryJson = await summaryRes.json();

      const analyticsRes = await fetch(
        `http://localhost:3000/api/analytics/transactions?from=${fromDate}&to=${toDate}`
      );
      const analyticsJson = await analyticsRes.json();

      if (summaryJson.success) {
        setStats((prev) => ({
          ...prev,
          total_bookings: summaryJson.stats.total_bookings,
          completed: summaryJson.stats.completed,
          upcoming: summaryJson.stats.upcoming,
        }));
      }

      if (analyticsJson.analytics) {
        const { analytics } = analyticsJson;
        setStats((prev) => ({
          ...prev,
          totalRevenue: analytics.totalGrossAmount || 0,
        }));

        setRevenueBreakdown({
          totalPlatformFees: analytics.totalPlatformFees || 0,
          totalConsultationFees: analytics.totalConsultationFees || 0,
          totalServiceFees: analytics.totalServiceFees || 0,
          totalTaxes: analytics.totalTaxes || 0,
        });
      }
    } catch (err) {
      console.error("Failed to fetch analytics data", err);
    }
  };

  // Fetch Logic for the Table (API 34)
  const fetchListData = async () => {
    if (!activeListView) return;
    setListLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/booking?from=${fromDate}&to=${toDate}&type=${activeListView}&page=${currentPage}&per_page=${perPage}`
      );
      const json = await response.json();
      if (json.success) {
        setListData(json.data);
        setTotalPages(json.meta.total_pages || 1);
        setTotalResults(json.meta.total || 0);
      }
    } catch (error) {
      console.error("Error fetching detailed list:", error);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchListData();
  }, [activeListView, fromDate, toDate, currentPage, perPage]);

  // Table Columns
  const columns: Column<any>[] = [
    {
      header: "Patient Details",
      render: (item) => (
        <div>
          <div className="font-medium text-slate-700">{item.patient?.name || "N/A"}</div>
          <div className="text-xs text-slate-500">{item.patient?.email || "N/A"}</div>
        </div>
      ),
    },
    {
      header: "Practitioner",
      render: (item) => <div className="text-slate-700">{item.practitioner.name}</div>,
    },
    {
      header: "Appointment Date",
      render: (item) => (
        <div>
          <div className="font-medium">{item.appointment_date}</div>
          <div className="text-xs text-slate-500">{item.start_time} - {item.end_time}</div>
        </div>
      ),
    },
    {
      header: "Type",
      render: (item) => <span className="text-slate-600">{item.appointment_type}</span>,
    },
    {
      header: "Status",
      render: (item) => (
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
          {item.status}
        </span>
      ),
    },
  ];

  const openDetails = (type: "total" | "upcoming" | "completed" | "cancelled") => {
    setActiveListView(type);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="date"
            label="From Date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            label="To Date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={stats.total_bookings}
          color="blue"
          clickable
          onClick={() => openDetails("total")}
        />
        <StatCard
          label="Appts. Completed"
          value={stats.completed}
          color="green"
          clickable
          onClick={() => openDetails("completed")}
        />
        <StatCard
          label="Upcoming Appts."
          value={stats.upcoming}
          color="orange"
          clickable
          onClick={() => openDetails("upcoming")}
        />
        <StatCard
          label="Total Revenue"
          value={`LKR ${stats.totalRevenue.toLocaleString()}`}
          color="purple"
          clickable
          onClick={() => setShowRevenueModal(true)}
        />
      </div>

      {/* FULL WIDTH TABLE VIEW */}
      {activeListView && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {activeListView.replace("_", " ")} Bookings List
            </h3>
            <button
              onClick={() => setActiveListView(null)}
              className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-xs transition-colors"
            >
              <XCircle size={16} /> Close Table
            </button>
          </div>

          <GenericTable
            columns={columns}
            data={listData}
            loading={listLoading}
            minWidth="1000px"
            pagination={{
              currentPage,
              totalPages,
              totalResults,
              perPage,
              onPageChange: setCurrentPage,
              onLimitChange: (limit) => {
                setPerPage(limit);
                setCurrentPage(1);
              },
            }}
          />
        </div>
      )}

      {showRevenueModal && (
        <RevenueBreakdownModal
          data={revenueBreakdown}
          onClose={() => setShowRevenueModal(false)}
        />
      )}
    </div>
  );
};

export default TrackBookingsTab;