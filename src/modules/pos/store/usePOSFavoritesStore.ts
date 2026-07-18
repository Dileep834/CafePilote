import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/store/useAuthStore';

interface FavoritesState {
  /** userId → productId[] */
  byUser: Record<string, string[]>;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  favoriteIds: () => string[];
}

function currentUserKey(): string {
  const user = useAuthStore.getState().user;
  return user?.id || user?.email || 'local-staff';
}

export const usePOSFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byUser: {},

      favoriteIds: () => {
        const key = currentUserKey();
        return get().byUser[key] || [];
      },

      isFavorite: (productId) => {
        const key = currentUserKey();
        return (get().byUser[key] || []).includes(productId);
      },

      toggleFavorite: (productId) => {
        const key = currentUserKey();
        set((s) => {
          const prev = s.byUser[key] || [];
          const next = prev.includes(productId)
            ? prev.filter((id) => id !== productId)
            : [...prev, productId];
          return { byUser: { ...s.byUser, [key]: next } };
        });
      },
    }),
    { name: 'cafepilots-pos-favorites' }
  )
);
