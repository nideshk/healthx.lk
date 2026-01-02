// src/components/dashboard/layout/DashboardMenuCard.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardBody } from "@/components/atom/Card/Card";

export type DashboardMenuItemId =
  | "home"
  | "searchClinician"
  | "searchPatient"
  | "addClinician"
  | "manageAdmins"
  | "analytics"
  | "settings";

export interface DashboardMenuItem {
  id: DashboardMenuItemId;
  label: string;
  description?: string;
}

interface DashboardMenuCardProps {
  title?: string;
  subtitle?: string;
  items: DashboardMenuItem[];
  activeId: DashboardMenuItemId;
  onChange: (id: DashboardMenuItemId) => void;
}

const DashboardMenuCard: React.FC<DashboardMenuCardProps> = ({
  title = "Clinician Menu",
  subtitle = "Quick access",
  items,
  activeId,
  onChange,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex-col items-start gap-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </CardHeader>
      <CardBody className="space-y-2">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition ${
                active
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div
                  className={`text-[11px] ${
                    active ? "text-blue-50" : "text-slate-500"
                  }`}
                >
                  {item.description}
                </div>
              )}
            </button>
          );
        })}
      </CardBody>
    </Card>
  );
};

export default DashboardMenuCard;
