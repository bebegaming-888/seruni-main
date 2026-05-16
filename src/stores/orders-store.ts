/**
 * orders-store.ts — Zustand + IndexedDB for Marketplace Order Management
 *
 * Data flow: Zustand (in-memory) → IndexedDB (persist) → Supabase (sync)
 *
 * Write path: local → IndexedDB immediately → Supabase async (fire-and-forget)
 * Read path:  IndexedDB (sync fallback) → Supabase (async refresh)
 *
 * Offline: order creation queues to offline-queue.ts → replayed on reconnect
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbGet, idbPut, idbDelete, idbGetAll } from "@/lib/idb-store";
import { idbGetAll as idbGetAllFn } from "@/lib/idb-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CartItem } from "@/lib/cart-store";
import {
  buildNewOrderMessage,
  buildOrderConfirmationMessage,
  buildStatusUpdateMessage,
  buildWALink,
} from "@/lib/order-wa";
import { enqueueOfflineSubmission } from "@/lib/offline-queue";
import type { BankAccount } from "@/lib/order-wa";

// ── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending_payment"
  | "awaiting_confirmation"
  | "confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type OrderItem = {
  productId: string;
  productName: string;
  sellerName: string;
  sellerWa: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Order = {
  id: string; // UUID from server, temp UUID pre-sync
  orderId: string; // human-readable: MPD-YYYYMMDD-NNNNNN
  buyerName: string;
  buyerWa: string;
  buyerAddress: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: "bank_transfer" | "cod" | null;
  paymentProofUrl: string | null;
  notes: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  _syncStatus: "synced" | "pending";
};

// ── Store Interface ───────────────────────────────────────────────────────────

interface OrdersState {
  orders: Order[];
  isLoaded: boolean;

  // ── Init ──────────────────────────────────────────────────────────
  load: () => Promise<void>;

  // ── Mutations ─────────────────────────────────────────────────────
  /** Create new order from cart + buyer info. Returns { orderId, waLink } */
  createOrder: (
    cart: CartItem[],
    buyer: { name: string; wa: string; address: string },
    paymentMethod: "bank_transfer" | "cod",
  ) => Promise<{ orderId: string; waLink: string }>;

  /** Update order status. Triggers stock management + WA notification. */
  updateStatus: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>;

  /** Upload payment proof image. Returns public URL. */
  addPaymentProof: (orderId: string, file: File) => Promise<string>;

  /** Cancel order (only if not shipped/completed). Restores stock. */
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;

  // ── Queries ────────────────────────────────────────────────────────
  getOrderById: (id: string) => Order | undefined;
  getOrderByOrderId: (orderId: string) => Order | undefined;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersBySeller: (sellerWa: string) => Order[];
  getOrdersByBuyer: (buyerWa: string) => Order[];
  getStats: () => OrderStats;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  cancelledOrders: number;
  byStatus: Record<OrderStatus, number>;
  topProducts: Array<{ name: string; totalSold: number; revenue: number }>;
}

// ── Status transition guards ─────────────────────────────────────────────────

const CAN_TRANSITION_TO: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["awaiting_confirmation", "cancelled"],
  awaiting_confirmation: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return CAN_TRANSITION_TO[from]?.includes(to) ?? false;
}

// ── Store ────────────────────────────────────────────────────────────────────

let _initialized = false;

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      isLoaded: false,

      // ── load ─────────────────────────────────────────────────────────────
      load: async () => {
        if (_initialized) return;

        // 1. Load from IndexedDB first (sync)
        const idbOrders = await idbGetAll<Order>("orders");
        if (idbOrders.length > 0) {
          set({ orders: idbOrders, isLoaded: true });
          _initialized = true;
        }

        // 2. Sync from Supabase
        if (isSupabaseConfigured) {
          const sb = getSupabase();
          if (sb) {
            try {
              const { data: remoteOrders, error } = await sb
                .from("marketplace_orders")
                .select(
                  `*, items:marketplace_order_items(*)`,
                )
                .order("created_at", { ascending: false });

              if (!error && remoteOrders) {
                const mapped: Order[] = remoteOrders.map((r) => ({
                  id: r.id,
                  orderId: r.order_id,
                  buyerName: r.buyer_name,
                  buyerWa: r.buyer_wa,
                  buyerAddress: r.buyer_address,
                  status: r.status as OrderStatus,
                  totalAmount: Number(r.total_amount),
                  paymentMethod: r.payment_method as "bank_transfer" | "cod" | null,
                  paymentProofUrl: r.payment_proof_url ?? null,
                  notes: r.notes ?? "",
                  items: (r.items ?? []).map((it: Record<string, unknown>) => ({
                    productId: String(it.product_id ?? ""),
                    productName: String(it.product_name ?? ""),
                    sellerName: String(it.seller_name ?? ""),
                    sellerWa: String(it.seller_wa ?? ""),
                    quantity: Number(it.quantity ?? 0),
                    unitPrice: Number(it.unit_price ?? 0),
                    subtotal: Number(it.subtotal ?? 0),
                  })),
                  createdAt: r.created_at,
                  updatedAt: r.updated_at,
                  _syncStatus: "synced" as const,
                }));

                // Upsert each to IndexedDB + update Zustand
                for (const order of mapped) {
                  await idbPut("orders", order);
                }

                const idb = await idbGetAll<Order>("orders");
                set({ orders: idb, isLoaded: true });
                _initialized = true;
              }
            } catch (err) {
              console.warn("[orders] Supabase fetch failed:", err);
              if (!get().isLoaded) {
                set({ isLoaded: true });
                _initialized = true;
              }
            }
          }
        } else {
          set({ isLoaded: true });
          _initialized = true;
        }
      },

      // ── createOrder ──────────────────────────────────────────────────────
      createOrder: async (cart, buyer, paymentMethod) => {
        const localId = crypto.randomUUID();
        const now = new Date().toISOString();

        const items: OrderItem[] = cart.map((ci) => ({
          productId: ci.product.id,
          productName: ci.product.name,
          sellerName: ci.product.seller_name,
          sellerWa: ci.product.seller_wa,
          quantity: ci.quantity,
          unitPrice: ci.product.price,
          subtotal: ci.product.price * ci.quantity,
        }));

        const totalAmount = items.reduce((s, i) => s + i.subtotal, 0);

        // Initial status: pending_payment (bank_transfer) or awaiting_confirmation (cod)
        const initialStatus: OrderStatus =
          paymentMethod === "cod" ? "awaiting_confirmation" : "pending_payment";

        const order: Order = {
          id: localId,
          orderId: `MPD-LOCAL`, // server will replace
          buyerName: buyer.name,
          buyerWa: buyer.wa,
          buyerAddress: buyer.address,
          status: initialStatus,
          totalAmount,
          paymentMethod,
          paymentProofUrl: null,
          notes: "",
          items,
          createdAt: now,
          updatedAt: now,
          _syncStatus: "pending",
        };

        // Optimistic write to Zustand + IndexedDB
        set((s) => ({ orders: [order, ...s.orders] }));
        await idbPut("orders", order);

        // ── Offline path ──────────────────────────────────────────────
        if (typeof window !== "undefined" && !navigator.onLine) {
          await enqueueOfflineSubmission({
            type: "CREATE_ORDER",
            data: {
              cart: cart.map((ci) => ({ id: ci.product.id, quantity: ci.quantity })),
              buyer,
              paymentMethod,
              localId,
              now,
            },
          });

          const msg = buildOrderConfirmationMessage(order, []);
          return { orderId: `MPD-... (offline)`, waLink: buildWALink(buyer.wa, msg) };
        }

        // ── Online path ──────────────────────────────────────────────
        const sb = getSupabase();
        if (!sb || !isSupabaseConfigured) {
          const msg = buildOrderConfirmationMessage(order, []);
          return { orderId: order.orderId, waLink: buildWALink(buyer.wa, msg) };
        }

        try {
          const { data: inserted, error: orderErr } = await sb
            .from("marketplace_orders")
            .insert({
              buyer_name: buyer.name,
              buyer_wa: buyer.wa,
              buyer_address: buyer.address,
              status: initialStatus,
              total_amount: totalAmount,
              payment_method: paymentMethod,
            })
            .select()
            .single();

          if (orderErr) throw orderErr;

          // Insert order items
          const itemRows = items.map((it) => ({
            order_id: inserted.id,
            product_id: it.productId,
            product_name: it.productName,
            seller_name: it.sellerName,
            seller_wa: it.sellerWa,
            quantity: it.quantity,
            unit_price: it.unitPrice,
          }));

          const { error: itemErr } = await sb
            .from("marketplace_order_items")
            .insert(itemRows);

          if (itemErr) {
            // Rollback order on item failure
            await sb.from("marketplace_orders").delete().eq("id", inserted.id).throwOnError();
            throw itemErr;
          }

          // Update local record with server data
          const serverOrder: Order = {
            ...order,
            id: inserted.id,
            orderId: inserted.order_id,
            createdAt: inserted.created_at,
            updatedAt: inserted.updated_at,
            _syncStatus: "synced",
          };

          await idbPut("orders", serverOrder);
          set((s) => ({
            orders: s.orders.map((o) => (o.id === localId ? serverOrder : o)),
          }));

          // WA: notify sellers
          const sellerWAs = [...new Set(items.map((i) => i.sellerWa).filter(Boolean))];
          const sellerMsg = buildNewOrderMessage(serverOrder);
          for (const wa of sellerWAs) {
            window.open(buildWALink(wa, sellerMsg), "_blank");
          }

          // WA: confirm to buyer
          const { data: configData } = await sb
            .from("cms_contents")
            .select("metadata")
            .eq("type", "marketplace_config")
            .single();

          const bankAccounts: BankAccount[] =
            (configData?.metadata as Record<string, unknown>)?.bank_accounts ?? [];
          const buyerMsg = buildOrderConfirmationMessage(serverOrder, bankAccounts);
          const buyerWaLink = buildWALink(serverOrder.buyerWa, buyerMsg);

          return { orderId: serverOrder.orderId, waLink: buyerWaLink };
        } catch (err) {
          console.warn("[orders] createOrder failed, queued for retry:", err);
          await enqueueOfflineSubmission({
            type: "CREATE_ORDER",
            data: {
              cart: cart.map((ci) => ({ id: ci.product.id, quantity: ci.quantity })),
              buyer,
              paymentMethod,
              localId,
              now,
            },
          });
          const msg = buildOrderConfirmationMessage(order, []);
          return { orderId: order.orderId, waLink: buildWALink(buyer.wa, msg) };
        }
      },

      // ── updateStatus ────────────────────────────────────────────────────
      updateStatus: async (orderId, newStatus, notes) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;

        if (!canTransition(order.status, newStatus)) {
          console.warn(
            `[orders] Invalid transition: ${order.status} → ${newStatus}`,
          );
          return;
        }

        const now = new Date().toISOString();

        // Optimistic update
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: newStatus, updatedAt: now, notes: notes ?? o.notes, _syncStatus: "pending" as const }
              : o,
          ),
        }));
        const updated = { ...order, status: newStatus, updatedAt: now, notes: notes ?? order.notes };
        await idbPut("orders", updated);

        // Supabase sync
        const sb = getSupabase();
        if (sb && isSupabaseConfigured) {
          const updatePayload: Record<string, unknown> = { status: newStatus };
          if (notes !== undefined) updatePayload.notes = notes;

          const { error } = await sb
            .from("marketplace_orders")
            .update(updatePayload)
            .eq("id", orderId);

          if (!error) {
            set((s) => ({
              orders: s.orders.map((o) =>
                o.id === orderId ? { ...o, _syncStatus: "synced" as const } : o,
              ),
            }));
            await idbPut("orders", { ...updated, _syncStatus: "synced" });
          }
        }

        // Stock management: confirmed → decrement, cancelled → restore
        if (newStatus === "confirmed") {
          _decrementStock(order.items);
        }
        if (newStatus === "cancelled") {
          _incrementStock(order.items);
        }

        // WA to buyer
        const statusMsg = buildStatusUpdateMessage({ ...order, status: newStatus, updatedAt: now }, newStatus);
        window.open(buildWALink(order.buyerWa, statusMsg), "_blank");
      },

      // ── addPaymentProof ─────────────────────────────────────────────────
      addPaymentProof: async (orderId, file) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) throw new Error("Order not found");

        const path = `payment_proofs/${orderId}/${Date.now()}_${file.name}`;
        const sb = getSupabase();

        if (!sb || !isSupabaseConfigured) {
          throw new Error("Supabase not configured");
        }

        const { error: uploadError } = await sb.storage
          .from("payment_proofs")
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = sb.storage
          .from("payment_proofs")
          .getPublicUrl(path);

        const proofUrl = urlData.publicUrl;

        // Optimistic update
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, paymentProofUrl: proofUrl, _syncStatus: "pending" as const } : o,
          ),
        }));
        await idbPut("orders", { ...order, paymentProofUrl: proofUrl });

        // Supabase: update proof URL + auto-advance to awaiting_confirmation if was pending_payment
        const { error: updateErr } = await sb
          .from("marketplace_orders")
          .update({ payment_proof_url: proofUrl, status: "awaiting_confirmation" })
          .eq("id", orderId);

        if (updateErr) throw updateErr;

        // If was pending_payment, also advance local status
        if (order.status === "pending_payment") {
          set((s) => ({
            orders: s.orders.map((o) =>
              o.id === orderId ? { ...o, status: "awaiting_confirmation" as OrderStatus, updatedAt: new Date().toISOString() } : o,
            ),
          }));
        }

        return proofUrl;
      },

      // ── cancelOrder ──────────────────────────────────────────────────────
      cancelOrder: async (orderId, reason) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        if (order.status === "shipped" || order.status === "completed") {
          throw new Error("Pesanan yang sudah dikirim atau selesai tidak dapat dibatalkan.");
        }
        await get().updateStatus(orderId, "cancelled", reason);
      },

      // ── Queries ──────────────────────────────────────────────────────────
      getOrderById: (id) => get().orders.find((o) => o.id === id),
      getOrderByOrderId: (orderId) => get().orders.find((o) => o.orderId === orderId),
      getOrdersByStatus: (status) => get().orders.filter((o) => o.status === status),
      getOrdersBySeller: (sellerWa) =>
        get().orders.filter((o) => o.items.some((i) => i.sellerWa === sellerWa)),
      getOrdersByBuyer: (buyerWa) => get().orders.filter((o) => o.buyerWa === buyerWa),
      getStats: () => {
        const orders = get().orders.filter((o) => o.status !== "cancelled");
        const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
        const completedOrders = orders.filter((o) => o.status === "completed").length;
        const cancelledOrders = get().orders.filter((o) => o.status === "cancelled").length;
        const byStatus = get().orders.reduce(
          (acc, o) => {
            acc[o.status] = (acc[o.status] ?? 0) + 1;
            return acc;
          },
          {} as Record<OrderStatus, number>,
        );

        // Top products by quantity sold
        const productMap = new Map<string, { name: string; totalSold: number; revenue: number }>();
        for (const order of orders) {
          if (order.status === "completed" || order.status === "shipped") {
            for (const item of order.items) {
              const existing = productMap.get(item.productId) ?? {
                name: item.productName,
                totalSold: 0,
                revenue: 0,
              };
              existing.totalSold += item.quantity;
              existing.revenue += item.subtotal;
              productMap.set(item.productId, existing);
            }
          }
        }
        const topProducts = [...productMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        return { totalOrders: orders.length, totalRevenue, completedOrders, cancelledOrders, byStatus, topProducts };
      },
    }),
    {
      name: "seruni-orders-store",
      partialize: (state) => ({
        // Only persist synced orders; pending orders in IndexedDB
        orders: state.orders.filter((o) => o._syncStatus === "synced"),
      }),
    },
  ),
);

// ── Stock helpers (called by updateStatus) ──────────────────────────────────

async function _decrementStock(items: OrderItem[]): Promise<void> {
  const { useMarketplaceStore } = await import("@/lib/content-store");
  const store = useMarketplaceStore.getState();
  for (const item of items) {
    const product = store.items.find((p) => p.id === item.productId);
    if (product && product.stock >= item.quantity) {
      const newStock = product.stock - item.quantity;
      store.update(item.productId, { stock: newStock });
    }
  }
}

async function _incrementStock(items: OrderItem[]): Promise<void> {
  const { useMarketplaceStore } = await import("@/lib/content-store");
  const store = useMarketplaceStore.getState();
  for (const item of items) {
    const product = store.items.find((p) => p.id === item.productId);
    if (product) {
      store.update(item.productId, { stock: product.stock + item.quantity });
    }
  }
}