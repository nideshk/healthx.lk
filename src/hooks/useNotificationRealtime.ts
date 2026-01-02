import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useEffect } from "react";

export function useNotificationRealtime(userId: string, onNew: () => void) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseBrowser
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
          onNew(); // refetch notifications
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId]);
}
