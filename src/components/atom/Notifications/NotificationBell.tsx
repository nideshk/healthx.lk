"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import axios from "axios";

export default function NotificationBell({
  notifications,
  unreadCount,
  onRefresh,
}: {
  notifications: any[];
  unreadCount: number;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  async function markAsRead(id: string) {
    await axios.patch(`/api/notifications/${id}/read`);
    onRefresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50">
          <div className="p-3 border-b font-semibold text-sm">
            Notifications
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-sm text-gray-500">
                No notifications
              </p>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`p-3 cursor-pointer text-sm border-b hover:bg-gray-50 ${
                  n.status === "unread" ? "bg-blue-50" : ""
                }`}
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-gray-600">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
