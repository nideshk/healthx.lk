"use client";

import React, { useState } from "react";
import Button from "@/components/atom/Button/Button";
import { Menu, X } from "lucide-react"; // Install lucide-react or use your own icons

interface DashboardShellProps {
  title: string;
  subtitle?: string;
  profileName: string;
  profileRole: string;
  onLogout?: () => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode; // New prop to pass the sidebar menu
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  title,
  subtitle,
  profileName,
  profileRole,
  onLogout,
  children,
  sidebar,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Hamburger Icon - Visible only on mobile */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="hidden md:block text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="text-sm font-semibold text-slate-900">{profileName}</div>
            <div className="text-slate-400">{profileRole}</div>
          </div>
        </div>
      </header>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white p-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-blue-600">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)}><X size={20}/></button>
            </div>
            {/* This is the "Component Call" your friend mentioned */}
            <div onClick={() => setIsMobileMenuOpen(false)}>
              {sidebar}
            </div>
          </div>
        </div>
      )}

      {/* PAGE CONTENT */}
      <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
    </div>
  );
};

export default DashboardShell;