"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  color: "blue" | "green" | "orange" | "purple";
  clickable?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  color,
  clickable = false,
  onClick,
}) => {
  const colorMap = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    orange: "bg-orange-500",
    purple: "bg-purple-600",
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${colorMap[color]} text-white rounded-xl p-4
        ${clickable ? "cursor-pointer hover:opacity-90" : ""}
      `}
    >
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
};

export default StatCard;
