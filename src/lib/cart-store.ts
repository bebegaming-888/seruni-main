/**
 * cart-store.ts — Zustand + localStorage persist for Marketplace cart
 * Survives SPA navigation. Survives page refresh.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MarketplaceItem } from "@/lib/content-store";

export type CartItem = {
  product: MarketplaceItem;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: MarketplaceItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { product, quantity: 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.product.id !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.product.id === productId ? { ...i, quantity } : i,
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((s, i) => s + i.product.price * i.quantity, 0),
    }),
    {
      name: "seruni-marketplace-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
