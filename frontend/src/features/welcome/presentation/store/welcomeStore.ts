import { create } from 'zustand';

// Ephemeral, in-memory only. No persistence: closing the tab clears it.
// `armed` is set true at the moment the user successfully logs in and is
// consumed by /bienvenida -> "Continuar" or by an explicit logout.
type WelcomeStore = {
  armed: boolean;
  arm: () => void;
  disarm: () => void;
};

export const useWelcomeStore = create<WelcomeStore>((set) => ({
  armed: false,
  arm: () => set({ armed: true }),
  disarm: () => set({ armed: false }),
}));
