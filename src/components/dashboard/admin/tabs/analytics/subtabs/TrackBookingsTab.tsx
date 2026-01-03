"use client";

import React, { useState, useEffect } from "react";
import { DateTime } from "luxon";
import StatCard from "../subtabs/StatCard";
import RevenueBreakdownModal from "../subtabs/RevenueBreakdownModal";
import BookingDetailsModal from "../subtabs/BookingDetailsModal";
import Input from "@/components/atom/Input/Input";

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
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    type: "total" | "upcoming" | "completed" | "cancelled";
  }>({
    isOpen: false,
    type: "total",
  });

  const fetchData = async () => {
    try {
      // 1. Fetch Booking Summary
      const summaryRes = await fetch(
        `http://localhost:3000/api/booking/summary?from=${fromDate}&to=${toDate}`
      );
      const summaryJson = await summaryRes.json();
      
      // 2. Fetch Transaction Analytics
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

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate]);

  const openDetails = (type: "total" | "upcoming" | "completed" | "cancelled") => {
    setDetailModal({ isOpen: true, type });
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

      {showRevenueModal && (
        <RevenueBreakdownModal
          data={revenueBreakdown}
          onClose={() => setShowRevenueModal(false)}
        />
      )}

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