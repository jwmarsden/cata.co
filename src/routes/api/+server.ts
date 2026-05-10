import type { RequestHandler } from './$types';

// Shared state (in-memory, resets on server restart)
let clickCount = 0;
const clients = new Set<ReadableStreamDefaultController>();

// SSE stream — browsers connect here to receive updates
export const GET: RequestHandler = () => {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      clients.add(controller);
      // Send current count immediately on connect
      controller.enqueue(`data: ${clickCount}\n\n`);
    },
    cancel() {
      clients.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
};

// POST endpoint — called when any client clicks
export const POST: RequestHandler = () => {
  clickCount++;
  // Broadcast to all connected clients
  for (const client of clients) {
    client.enqueue(`data: ${clickCount}\n\n`);
  }
  return new Response(null, { status: 204 });
};