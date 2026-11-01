import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import redis from '$lib/server/mem/redis';
import { mooWorld } from '../../../../server/moo-worlds.js';
import { TICKET_PREFIX } from '../../../../server/moo-relay.js';

const PER_MINUTE = 10; // tickets an IP address may ask for

// A one-time pass for the relay (server/moo-relay.js): which world, and the
// IP address it's for. No sign-in: anyone may use /moo, from this site.
export async function POST({ request, url, getClientAddress }) {
	if (request.headers.get('origin') !== url.origin) error(403, 'Forbidden');
	if (!request.headers.get('content-type')?.startsWith('application/json')) error(415, 'JSON only');
	const ip = getClientAddress();
	const key = `moo:tickets:${ip}`;
	const count = await redis.incr(key);
	if (count === 1) await redis.expire(key, 60);
	if (count > PER_MINUTE) error(429, 'Slow down');
	const { world } = await request.json().catch(() => ({}));
	if (!mooWorld(world)) error(400, 'No such world');
	const ticket = randomUUID();
	await redis.set(TICKET_PREFIX + ticket, JSON.stringify({ ip, world }), 'EX', 30);
	return json({ ticket });
}
