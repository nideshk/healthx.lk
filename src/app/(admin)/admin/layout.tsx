"use client";
import AdminMenu from "@/components/admin/AdminMenu";
import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Body */}
      <main className="flex flex-1 p-6 gap-6">
        <div className="w-64 shrink-0">
          <AdminMenu />
        </div>
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
