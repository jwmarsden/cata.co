import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { location_counter } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isRateLimited } from '$lib/server/rateLimit';

// SSE client registry
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

function broadcast(city: string, country: string, latitude: number, longitude: number, count: number) {
  const cityClients = clients.get(city);
  if (!cityClients) return;
  const payload = JSON.stringify({ city, country, latitude, longitude, count });
  for (const client of cityClients) {
    client.enqueue(`data: ${payload}\n\n`);
  }
}

// GET 
export const GET: RequestHandler = async ({ url }) => {
  if(url.searchParams.has('city')) {
    const city = url.searchParams.get('city') ?? 'Unknown';
    const [row] = await db
      .select()
      .from(location_counter)
      .where(eq(location_counter.city, city));
    const location = row?.location;
    const country = row?.country ?? 'Unknown';
    const x = location?.x;
    const y = location?.y;
    const currentCount = row?.count ?? 0;
    let controller: ReadableStreamDefaultController;
    const stream = new ReadableStream({
    start(c) {
      controller = c;
      if (!clients.has(city)) clients.set(city, new Set());
      clients.get(city)!.add(controller);
      // Send current count immediately on connect
      controller.enqueue(`data: ${JSON.stringify({ city, country, latitude: y, longitude: x, srid: 4326,count: currentCount })}\n\n`);
    },
    cancel() {
      clients.get(city)?.delete(controller);
      if (clients.get(city)?.size === 0) clients.delete(city);
    }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } else {
    let controller: ReadableStreamDefaultController;
    const cities: string[] = [];
    const allLocations = await db.select().from(location_counter);
    const stream = new ReadableStream({
      start(c) {
        controller = c;
        for (const location of allLocations) {
          const city = location.city;
          cities.push(city); 
          //console.log(location.id, location.city, location.location, location.count);
          if (!clients.has(location.city)) clients.set(location.city, new Set());
          clients.get(location.city)!.add(controller);
          controller.enqueue(`data: ${JSON.stringify({ city: location.city, latitude: location.location?.y, longitude: location.location?.x, srid: 4326,count: location.count })}\n\n`);
        }
      },
      cancel() {
        for (const city of cities) {
          clients.get(city)?.delete(controller);
          if (clients.get(city)?.size === 0) clients.delete(city);
        }
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
};

// POST — receive click with coords, reverse geocode, upsert counter
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  // Rate limiting
  const ip = getClientAddress();
  if (isRateLimited(ip)) {
    return new Response('Too many requests', { status: 429 });
  }

  //console.log('Incoming request from IP:', ip);

  // Parse and validate body
  let latitude: number, longitude: number, city: string, country: string;
  try {
    const body = await request.json();
    city = body.city;
    country = body.country;
    latitude = parseFloat(body.latitude);
    longitude = parseFloat(body.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.log('Invalid coordinates:', body.latitude, body.longitude);
      throw new Error();
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.log('Coordinates out of bounds:', body.latitude, body.longitude);
      throw new Error();
    }
  } catch {
    return new Response('Invalid coordinates', { status: 400 });
  }

  //console.log(`Received click from IP ${ip}: ${city} (${latitude}, ${longitude})`);
  // Upsert — insert city if new, increment count if existing
  const [row] = await db
    .insert(location_counter)
    .values({ city, country, location: { y: latitude, x: longitude}, count: 1 })
    .onConflictDoUpdate({
      target: location_counter.city,
      set: {
        count: sql`${location_counter.count} + 1`,
        updatedAt: sql`now()`
      }
    })
    .returning();

  // Broadcast updated count to all clients watching this city
  broadcast(city, row.country, row.location?.y, row.location?.x, row.count);

  //console.log(`Updated count for ${city}: ${row.count}`);
  return Response.json({ city: row.city, country: row.country, latitude: row.location?.y, longitude: row.location?.x, count: row.count });
};