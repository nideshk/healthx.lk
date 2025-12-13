"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, Search, CalendarDays, User, Settings } from "lucide-react";

const items = [
  { href: "/admin", label: "Add Clinician", icon: <UserPlus size={16} /> },
  { href: "/admin/clinicians", label: "Search Clinician", icon: <Search size={16} /> },
  { href: "/admin/bookings", label: "Bookings Tracking", icon: <CalendarDays size={16} /> },
  { href: "/admin/patients", label: "Search Patient", icon: <User size={16} /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings size={16} /> },
];

export default function AdminMenu() {
  const path = usePathname();
  return (
    <aside className="border border-gray-200 shadow-sm rounded-lg p-3 bg-white text-sm">
      <h2 className="font-semibold mb-2 text-base">Admin Menu</h2>
      <div className="space-y-1">
        {items.map((item) => {
          const active = path === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition 
                  ${active ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
