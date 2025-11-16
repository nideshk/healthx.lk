import { create } from "zustand";

interface ModalStore {
  isLoginModalOpen: boolean;
  isSignupModalOpen: boolean;

  openLoginModal: () => void;
  closeLoginModal: () => void;

  openSignupModal: () => void;
  closeSignupModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isLoginModalOpen: false,
  isSignupModalOpen: false,

  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),

  openSignupModal: () => set({ isSignupModalOpen: true }),
  closeSignupModal: () => set({ isSignupModalOpen: false }),
}));
