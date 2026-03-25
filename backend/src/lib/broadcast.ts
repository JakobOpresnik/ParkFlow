import type { Response } from "express";

interface SseClient {
  id: number;
  res: Response;
}

let nextId = 1;
const clients: SseClient[] = [];

/** Register an SSE client. Returns a cleanup function. */
export function addClient(res: Response): () => void {
  const client: SseClient = { id: nextId++, res };
  clients.push(client);

  return () => {
    const idx = clients.findIndex((c) => c.id === client.id);
    if (idx !== -1) clients.splice(idx, 1);
  };
}

/** Broadcast a spot_change event to all connected SSE clients. */
export function broadcast(type: string = "spot_change"): void {
  const payload = `event: ${type}\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      // Client disconnected — will be cleaned up on 'close'
    }
  }
}

/** Number of currently connected clients (for health/debug). */
export function clientCount(): number {
  return clients.length;
}
