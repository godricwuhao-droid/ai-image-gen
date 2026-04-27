import { create } from 'zustand';
import type { User, Generation } from '../types';
import { authService, generationService } from '../services/api';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  generations: Generation[];
  currentGeneration: Generation | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  createGeneration: (data: { prompt: string; size: string; quality: string; n: number }) => Promise<void>;
  fetchGeneration: (id: number) => Promise<void>;
  fetchGenerations: (page?: number) => Promise<void>;
  deleteGeneration: (id: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  generations: [],
  currentGeneration: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.login(email, password);
      await get().fetchUser();
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      await authService.register(email, username, password);
      await get().login(email, password);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Registration failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false, generations: [], currentGeneration: null });
  },

  fetchUser: async () => {
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
    }
  },

  createGeneration: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const generation = await generationService.create(data);
      set({ currentGeneration: generation });
      get().fetchGenerations();
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Generation failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGeneration: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const generation = await generationService.get(id);
      set({ currentGeneration: generation });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch generation' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchGenerations: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const data = await generationService.list(page);
      set({ generations: data.generations });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch generations' });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteGeneration: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await generationService.delete(id);
      get().fetchGenerations();
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to delete generation' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
