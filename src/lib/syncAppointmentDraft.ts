import debounce from "lodash.debounce";
import { useBookingDraftStore } from "@/stores/useBookingDraftStore";

export const syncAppointmentDraft = debounce(async () => {
  const { data, dirty, markClean } =
    useBookingDraftStore.getState();

  if (!dirty) return;

  try {
    await fetch("/api/booking/appointment/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    markClean();
  } catch (err) {
    // silent failure — retry next time
    console.warn("Draft sync failed, will retry");
  }
}, 4000);
