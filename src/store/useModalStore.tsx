import { create } from "zustand";

interface ModalStore {
  isLoginModalOpen: boolean;
  isSignupModalOpen: boolean;
  redirectTo: string | null;

  openLoginModal: (redirectTo?: string) => void;
  closeLoginModal: () => void;

  openSignupModal: () => void;
  closeSignupModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isLoginModalOpen: false,
  isSignupModalOpen: false,
  redirectTo: null,

  openLoginModal: (redirectTo) =>
    set({ isLoginModalOpen: true, redirectTo: redirectTo || null }),

  closeLoginModal: () =>
    set({ isLoginModalOpen: false, redirectTo: null }),

  openSignupModal: () => set({ isSignupModalOpen: true }),
  closeSignupModal: () => set({ isSignupModalOpen: false }),
}));
