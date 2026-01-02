// src/components/dashboard/layout/DashboardShell.tsx
"use client";

import React from "react";
import Button from "@/components/atom/Button/Button";

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  profileName: string;
  profileRole: string;
  onLogout?: () => void;
  children: React.ReactNode;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  subtitle,
  profileName,
  profileRole,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="text-sm font-semibold text-slate-900">
              {profileName}
            </div>
            <div className="text-slate-400">{profileRole}</div>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 px-8 py-6">{children}</main>
    </div>
  );
};

export default DashboardShell;
