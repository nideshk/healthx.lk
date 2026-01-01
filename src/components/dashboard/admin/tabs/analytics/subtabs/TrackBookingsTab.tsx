"use client";

import React, { useState } from "react";
import StatCard from "../subtabs/StatCard";
import RevenueBreakdownModal from "../subtabs/RevenueBreakdownModal";
import Input from "@/components/atom/Input/Input";

const STATS = {
  totalBookings: 8,
  completed: 4,
  upcoming: 4,
  totalRevenue: 17000,
};

const TrackBookingsTab: React.FC = () => {
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  return (
    <>
    
          {/* ------------------------------------------------ */}
          {/* FILTER SECTION (EXACT SS)                        */}
          {/* ------------------------------------------------ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input type="date" label="From Date" />
              <Input type="date" label="To Date" />
    
             
            </div>
    
          </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={STATS.totalBookings} color="blue" />
        <StatCard label="Appts. Completed" value={STATS.completed} color="green" />
        <StatCard label="Upcoming Appts." value={STATS.upcoming} color="orange" />
        <StatCard
          label="Total Revenue"
          value={`LKR ${STATS.totalRevenue.toLocaleString()}`}
          color="purple"
          clickable
          onClick={() => setShowRevenueModal(true)}
        />
      </div>

      {showRevenueModal && (
        <RevenueBreakdownModal
          data={{ platformFees: 6800, doctorEarnings: 10200 }}
          onClose={() => setShowRevenueModal(false)}
        />
      )}
    </>
  );
};

export default TrackBookingsTab;
