/**
 * cart-store.ts — Zustand cart untuk halaman Wisata / UMKM
 *
 * Persist ke localStorage (tidak ke IndexedDB — ini bukan data resmi desa).
 * Zustand middleware `persist` menangani serialisasi otomatis.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MarketplaceItem } from "@/lib/content-store";

export type CartItem = {
  product: MarketplaceItem;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  addItem: (product: MarketplaceItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
            ),
          });
        } else {
          set({ items: [...items, { product, quantity: 1 }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),

      totalPrice: () => get().items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    }),
    {
      name: "mitradesa_cart",
      // only persist items array, skip hydration metadata
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
