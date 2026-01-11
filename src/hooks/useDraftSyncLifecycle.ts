import { useEffect } from "react";
import { syncAppointmentDraft } from "@/lib/syncAppointmentDraft";

export function useDraftSyncLifecycle() {
  useEffect(() => {
    const flush = () => syncAppointmentDraft.flush();

    window.addEventListener("beforeunload", flush);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}
