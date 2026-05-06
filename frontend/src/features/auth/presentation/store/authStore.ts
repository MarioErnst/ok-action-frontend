import { create } from 'zustand';
import type { User } from '../../domain/entities/User';

type AuthStore = {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: (() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  })(),
  accessToken: localStorage.getItem('auth_token'),
  setAuth: (user, token) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
    set({ user, accessToken: token });
  },
  logout: () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    set({ user: null, accessToken: null });
  },
}));
