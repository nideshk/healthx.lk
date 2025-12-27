"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/atom/Button/Button";

interface RevenueBreakdownModalProps {
  data: {
    platformFees: number;
    doctorEarnings: number;
  };
  onClose: () => void;
}

const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({
  data,
  onClose,
}) => {
  const total = data.platformFees + data.doctorEarnings;

  const chartData = [
    {
      name: "Platform Fees",
      value: data.platformFees,
      percent: ((data.platformFees / total) * 100).toFixed(1),
    },
    {
      name: "Doctor Earnings",
      value: data.doctorEarnings,
      percent: ((data.doctorEarnings / total) * 100).toFixed(1),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0B0F19] rounded-2xl w-full max-w-md p-6 text-white shadow-2xl">

        {/* HEADER */}
        <div className="text-lg font-semibold mb-6">
          Revenue Breakdown
        </div>

        {/* CHART AREA */}
        <div className="flex items-center justify-between gap-4">

          {/* LEFT LABEL */}
          <div className="text-left">
            <div className="text-2xl font-semibold">
              {chartData[0].percent}%
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              Platform
            </div>
          </div>

          {/* DONUT CHART */}
          <div className="w-[160px] h-[160px]">
            <ResponsiveContainer>
              <PieChart>
                <defs>
                  {/* Platform Fees Gradient */}
                  <linearGradient id="tealLight" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="100%" stopColor="#14B8A6" />
                  </linearGradient>

                  {/* Doctor Earnings Gradient */}
                  <linearGradient id="tealDark" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#0F766E" />
                  </linearGradient>
                </defs>

                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={58}
                  outerRadius={72}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={800}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  <Cell fill="url(#tealLight)" />
                  <Cell fill="url(#tealDark)" />
                </Pie>
                <Tooltip
                contentStyle={{
                    backgroundColor: "#111827",
                    borderRadius: 8,
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                }}
                formatter={(value, name) => {
                    if (typeof value !== "number") return ["", name];
                    return [`LKR ${value.toLocaleString()}`, name];
                }}
                />

              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* RIGHT LABEL */}
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {chartData[1].percent}%
            </div>
            <div className="flex items-center justify-end gap-2 text-sm text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
              Doctors
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <LegendItem
            color="bg-teal-400"
            label="Platform Fees"
            value={`LKR ${data.platformFees.toLocaleString()}`}
          />
          <LegendItem
            color="bg-teal-700"
            label="Doctor Earnings"
            value={`LKR ${data.doctorEarnings.toLocaleString()}`}
          />
        </div>

        {/* ACTION */}
        <Button className="mt-6 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default RevenueBreakdownModal;

/* -------------------------------------------------------------------------- */
/*                              LEGEND ITEM                                   */
/* -------------------------------------------------------------------------- */

const LegendItem = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-300">{label}</span>
    </div>
    <span className="font-medium">{value}</span>
  </div>
);
