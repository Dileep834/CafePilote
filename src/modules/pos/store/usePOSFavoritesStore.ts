import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/store/useAuthStore';

export type FavoriteSort = 'recent' | 'ordered' | 'price' | 'az';

type FavMeta = {
  addedAt: number;
  orderCount: number;
};

interface FavoritesState {
  /** userId → productId[] (insertion order = recently added) */
  byUser: Record<string, string[]>;
  /** userId → pinned productIds */
  pinnedByUser: Record<string, string[]>;
  /** userId → productId → meta */
  metaByUser: Record<string, Record<string, FavMeta>>;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  favoriteIds: () => string[];
  togglePin: (productId: string) => void;
  isPinned: (productId: string) => boolean;
  bumpOrderCount: (productId: string) => void;
  getMeta: (productId: string) => FavMeta;
}

function currentUserKey(): string {
  const user = useAuthStore.getState().user;
  return user?.id || user?.email || 'local-staff';
}

const defaultMeta = (): FavMeta => ({ addedAt: Date.now(), orderCount: 0 });

export const usePOSFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byUser: {},
      pinnedByUser: {},
      metaByUser: {},

      favoriteIds: () => {
        const key = currentUserKey();
        return get().byUser[key] || [];
      },

      isFavorite: (productId) => {
        const key = currentUserKey();
        return (get().byUser[key] || []).includes(productId);
      },

      isPinned: (productId) => {
        const key = currentUserKey();
        return (get().pinnedByUser[key] || []).includes(productId);
      },

      getMeta: (productId) => {
        const key = currentUserKey();
        return get().metaByUser[key]?.[productId] || defaultMeta();
      },

      toggleFavorite: (productId) => {
        const key = currentUserKey();
        set((s) => {
          const prev = s.byUser[key] || [];
          const pinned = s.pinnedByUser[key] || [];
          const meta = { ...(s.metaByUser[key] || {}) };
          const isFav = prev.includes(productId);
          if (isFav) {
            delete meta[productId];
            return {
              byUser: { ...s.byUser, [key]: prev.filter((id) => id !== productId) },
              pinnedByUser: { ...s.pinnedByUser, [key]: pinned.filter((id) => id !== productId) },
              metaByUser: { ...s.metaByUser, [key]: meta },
            };
          }
          meta[productId] = { addedAt: Date.now(), orderCount: meta[productId]?.orderCount || 0 };
          return {
            byUser: { ...s.byUser, [key]: [...prev, productId] },
            metaByUser: { ...s.metaByUser, [key]: meta },
          };
        });
      },

      togglePin: (productId) => {
        const key = currentUserKey();
        set((s) => {
          const pinned = s.pinnedByUser[key] || [];
          const next = pinned.includes(productId)
            ? pinned.filter((id) => id !== productId)
            : [...pinned, productId];
          return { pinnedByUser: { ...s.pinnedByUser, [key]: next } };
        });
      },

      bumpOrderCount: (productId) => {
        const key = currentUserKey();
        set((s) => {
          const meta = { ...(s.metaByUser[key] || {}) };
          const prev = meta[productId] || defaultMeta();
          meta[productId] = { ...prev, orderCount: prev.orderCount + 1 };
          return { metaByUser: { ...s.metaByUser, [key]: meta } };
        });
      },
    }),
    { name: 'cafepilots-pos-favorites' }
  )
);
