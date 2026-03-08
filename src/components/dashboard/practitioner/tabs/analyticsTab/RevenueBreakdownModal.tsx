"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/atom/Button/Button";
import Price from "@/components/common/Price";

interface RevenueBreakdownModalProps {
  data: {
    platformFees: number;
    consultationFees: number;
    serviceFees: number;
    taxes: number;
  };
  onClose: () => void;
}

const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({
  data,
  onClose,
}) => {
  const total = data.platformFees + data.consultationFees + data.serviceFees + data.taxes;

  // Requirement 3: 4 distinct colors and data segments
  const chartData = [
    { name: "Platform Fees", value: data.platformFees, color: "#2DD4BF" }, // Teal
    { name: "Consultation Fees", value: data.consultationFees, color: "#3B82F6" }, // Blue
    { name: "Service Fees", value: data.serviceFees, color: "#F59E0B" }, // Amber
    { name: "Taxes", value: data.taxes, color: "#EF4444" }, // Red
  ].filter(item => item.value > 0); // Hide 0 value items to prevent chart glitches

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0B0F19] rounded-2xl w-full max-w-md p-6 text-white shadow-2xl">

        {/* HEADER */}
        <div className="text-lg font-semibold mb-6">
          Revenue Breakdown
        </div>

        {/* CHART AREA */}
        <div className="flex flex-col items-center justify-center gap-6">

          {/* DONUT CHART */}
          <div className="w-[200px] h-[200px] relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={800}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Total display in center of donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Gross</span>
              <span className="text-lg font-bold"><Price amount={total} /></span>
            </div>
          </div>
        </div>

        {/* LEGEND - Requirement 3: 4 items with diff colors */}
        <div className="mt-8 space-y-3">
          <LegendItem
            color="bg-[#2DD4BF]"
            label="Platform Fees"
            value={<Price amount={data.platformFees} />}
            percent={total > 0 ? ((data.platformFees / total) * 100).toFixed(1) : "0"}
          />
          <LegendItem
            color="bg-[#3B82F6]"
            label="Consultation Fees"
            value={<Price amount={data.consultationFees} />}
            percent={total > 0 ? ((data.consultationFees / total) * 100).toFixed(1) : "0"}
          />
          <LegendItem
            color="bg-[#F59E0B]"
            label="Service Fees"
            value={<Price amount={data.serviceFees} />}
            percent={total > 0 ? ((data.serviceFees / total) * 100).toFixed(1) : "0"}
          />
          <LegendItem
            color="bg-[#EF4444]"
            label="Taxes"
            value={<Price amount={data.taxes} />}
            percent={total > 0 ? ((data.taxes / total) * 100).toFixed(1) : "0"}
          />
        </div>

        {/* ACTION */}
        <Button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 border-none" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* LEGEND ITEM                                   */
/* -------------------------------------------------------------------------- */

const LegendItem = ({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: React.ReactNode;
  percent: string;
}) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-3">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-300 w-32">{label}</span>
      <span className="text-slate-500 text-xs">{percent}%</span>
    </div>
    <span className="font-semibold">{value}</span>
  </div>
);

export default RevenueBreakdownModal;