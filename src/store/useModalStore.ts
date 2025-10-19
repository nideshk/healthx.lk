import { create } from 'zustand';

type ModalStore = {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
};

interface ModalStoreState {
    isLoginModalOpen: boolean;
}

interface ModalStoreActions {
    openLoginModal: () => void;
    closeLoginModal: () => void;
}

export const useModalStore = create<ModalStoreState & ModalStoreActions>((set) => ({
    isLoginModalOpen: false,
    openLoginModal: () => set({ isLoginModalOpen: true }),
    closeLoginModal: () => set({ isLoginModalOpen: false }),
}));