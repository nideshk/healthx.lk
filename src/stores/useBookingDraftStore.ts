import { create } from "zustand";
import localforage from "localforage";
import { AppointmentFormInputs } from "@/types/FormType";

const STORAGE_KEY = "appointment_draft_v1";

type DraftState = {
  data: AppointmentFormInputs;
  hydrated: boolean;
  dirty: boolean;

  hydrate: () => Promise<void>;
  update: (partial: Partial<AppointmentFormInputs>) => void;
  markClean: () => void;
  reset: () => Promise<void>;
};

export const useBookingDraftStore = create<DraftState>((set, get) => ({
  hydrated: false,
  dirty: false,

  data: {
    consultation_fee: 0,
    platform_fee: 0,
    fee_charged: 0,
    address: "",
    phone: "",
    email: "",
    fullName: "",
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
  },

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
      data: {
        consultation_fee: 0,
        platform_fee: 0,
        fee_charged: 0,
        address: "",
        phone: "",
        email: "",
        fullName: "",
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
      },
      dirty: false,
    });
  },
}));
