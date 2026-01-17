import { create } from "zustand";
import localforage from "localforage";
import { AppointmentFormInputs } from "@/types/FormType";

const STORAGE_KEY = "appointment_draft_v1";

const emptyDraft: AppointmentFormInputs = {
  selectedServiceId: "",
  selectedServiceTitle: "",
  attendeeCount: 1,
  appointment_id: "",
  selectedDoctor: null,
  starts_at: "",
  ends_at: "",
  selectedAttendees: [],
  appointmentType: null,
  consent: {},
  pre_consultation: null,
  payment_status: null,
  selectedService: null,
  last_visited_step: 0,
};

type DraftStore = {
  data: AppointmentFormInputs;
  hydrated: boolean;
  dirty: boolean;

  hydrate: () => Promise<void>;
  update: (partial: Partial<AppointmentFormInputs>) => void;
  markClean: () => void;
  reset: () => Promise<void>;
};

export const useBookingDraftStore = create<DraftStore>((set) => ({
  data: emptyDraft,
  hydrated: false,
  dirty: false,

  hydrate: async () => {
    const cached = await localforage.getItem<AppointmentFormInputs>(STORAGE_KEY);
    if (cached) {
      set({ data: cached });
    }
    set({ hydrated: true });
  },

  update: (partial) =>
    set((state) => {
      const updated = { ...state.data, ...partial };
      localforage.setItem(STORAGE_KEY, updated); // fire & forget
      return { data: updated, dirty: true };
    }),

  markClean: () => set({ dirty: false }),

  reset: async () => {
    await localforage.removeItem(STORAGE_KEY);
    set({
      data: emptyDraft,
      dirty: false,
    });
  },
}));
