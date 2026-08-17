import { EventEmitter } from "node:events";

export type OrderEventType = "order.created" | "order.preparing" | "order.ready" | "order.completed" | "menu.updated";

export type OrderEvent = { type: OrderEventType; at: number };

/**
 * In-Process-Ereignisbus für die Echtzeit-Übertragung (SSE) zwischen Kasse und
 * Küche. Ein interner Event-Emitter + Polling-Fallback im Client.
 */
const g = globalThis as unknown as { __bsBus?: EventEmitter };
const bus = g.__bsBus ?? new EventEmitter();
if (!g.__bsBus) g.__bsBus = bus;

export function emitOrderEvent(ev: OrderEvent): void {
  bus.emit("order", ev);
}

export function onOrderEvent(handler: (ev: OrderEvent) => void): () => void {
  bus.on("order", handler);
  return () => bus.off("order", handler);
}