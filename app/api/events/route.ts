import { getSessionUser } from "@/lib/session";
import { onOrderEvent } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent-Events: liefert Bestell-Ereignisse in Echtzeit an Kasse & Küche.
 * Der Client nutzt außerdem einen Polling-Fallback (Server Actions), falls die
 * Verbindung unterbrochen wird.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream bereits geschlossen
        }
      };
      send({ type: "connected", at: Date.now() });
      const off = onOrderEvent((ev) => send(ev));
      const heartbeat = setInterval(() => send({ type: "ping", at: Date.now() }), 20_000);
      cleanup = () => {
        clearInterval(heartbeat);
        off();
      };
      request.signal.addEventListener("abort", () => {
        cleanup?.();
        try {
          controller.close();
        } catch {
          /* bereits geschlossen */
        }
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}