"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import axios from "axios";

export function useInAppNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    if (!userId) return;
    const res = await axios.get("/api/notifications");
    setNotifications(res.data.notifications || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const channel = supabaseClient
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter(
    (n) => n.status === "unread"
  ).length;

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
  };
}
