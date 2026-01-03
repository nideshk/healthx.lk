"use client";

import React, { useState, useEffect } from "react";
import { DateTime } from "luxon";
import StatCard from "../subtabs/StatCard";
import RevenueBreakdownModal from "../subtabs/RevenueBreakdownModal";
import BookingDetailsModal from "../subtabs/BookingDetailsModal";
import Input from "@/components/atom/Input/Input";

const TrackBookingsTab: React.FC = () => {
  // Default to current month
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
    totalRevenue: 17000, // Still using dummy for revenue as API 33 doesn't provide it
  });

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  
  // New Modal States
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    type: "total" | "upcoming" | "completed" | "cancelled";
  }>({
    isOpen: false,
    type: "total",
  });

  // Fetch API 33 Summary
  const fetchSummary = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/booking/summary?from=${fromDate}&to=${toDate}`
      );
      const json = await res.json();
      if (json.success) {
        setStats((prev) => ({
          ...prev,
          total_bookings: json.stats.total_bookings,
          completed: json.stats.completed,
          upcoming: json.stats.upcoming,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fromDate, toDate]);

  const openDetails = (type: "total" | "upcoming" | "completed" | "cancelled") => {
    setDetailModal({ isOpen: true, type });
  };

  return (
    <div className="space-y-6">
      {/* FILTER SECTION */}
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

      {/* STAT CARDS */}
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

      {/* REVENUE MODAL */}
      {showRevenueModal && (
        <RevenueBreakdownModal
          data={{ platformFees: 6800, doctorEarnings: 10200 }}
          onClose={() => setShowRevenueModal(false)}
        />
      )}

      {/* DYNAMIC LIST MODAL (API 34) */}
      <BookingDetailsModal
        isOpen={detailModal.isOpen}
        type={detailModal.type}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
      />
    </div>
  );
};

export default TrackBookingsTab;