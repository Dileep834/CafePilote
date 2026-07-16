import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  viewScale: number;
  setViewScale: (scale: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      viewScale: 100,
      setViewScale: (scale) => set({ viewScale: scale }),
    }),
    {
      name: 'app-settings',
    }
  )
);
