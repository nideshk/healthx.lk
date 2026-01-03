"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import Button from "@/components/atom/Button/Button";

interface RevenueBreakdownModalProps {
  data: {
    totalPlatformFees: number;
    totalConsultationFees: number;
    totalServiceFees: number;
    totalTaxes: number;
  };
  onClose: () => void;
}

const RevenueBreakdownModal: React.FC<RevenueBreakdownModalProps> = ({
  data,
  onClose,
}) => {
  const total = 
    data.totalPlatformFees + 
    data.totalConsultationFees + 
    data.totalServiceFees + 
    data.totalTaxes;

  const getPercent = (value: number) => {
    if (total === 0) return "0.0";
    return ((value / total) * 100).toFixed(1);
  };

  // Assigned distinct high-contrast colors for better differentiation
  const chartData = [
    { name: "Consultation", value: data.totalConsultationFees, color: "#14B8A6" }, // Teal
    { name: "Platform", value: data.totalPlatformFees, color: "#6366F1" },     // Indigo
    { name: "Service", value: data.totalServiceFees, color: "#F59E0B" },      // Amber
    { name: "Taxes", value: data.totalTaxes, color: "#F43F5E" },            // Rose
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0B0F19] rounded-2xl w-full max-w-md p-6 text-white shadow-2xl">

        <div className="text-lg font-semibold mb-6">
          Revenue Breakdown
        </div>

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
                  paddingAngle={4}
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={800}
                  animationEasing="ease-out"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Total Gross</span>
                <span className="text-xl font-bold">LKR {total.toLocaleString()}</span>
            </div>
          </div>

          {/* LEGEND GRID WITH DISTINCT COLORS */}
          <div className="w-full grid grid-cols-2 gap-y-5 gap-x-6">
            <LegendItem
              dotColor="bg-[#14B8A6]"
              label="Consultation"
              percent={getPercent(data.totalConsultationFees)}
              value={`LKR ${data.totalConsultationFees.toLocaleString()}`}
            />
            <LegendItem
              dotColor="bg-[#6366F1]"
              label="Platform"
              percent={getPercent(data.totalPlatformFees)}
              value={`LKR ${data.totalPlatformFees.toLocaleString()}`}
            />
            <LegendItem
              dotColor="bg-[#F59E0B]"
              label="Service"
              percent={getPercent(data.totalServiceFees)}
              value={`LKR ${data.totalServiceFees.toLocaleString()}`}
            />
            <LegendItem
              dotColor="bg-[#F43F5E]"
              label="Taxes"
              percent={getPercent(data.totalTaxes)}
              value={`LKR ${data.totalTaxes.toLocaleString()}`}
            />
          </div>
        </div>

        <Button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 border-none" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

const LegendItem = ({
  dotColor,
  label,
  value,
  percent
}: {
  dotColor: string;
  label: string;
  value: string;
  percent: string;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-[11px] text-slate-400 font-medium uppercase tracking-tight">
        {label} ({percent}%)
      </span>
    </div>
    <span className="text-sm font-semibold pl-4">{value}</span>
  </div>
);

export default RevenueBreakdownModal;