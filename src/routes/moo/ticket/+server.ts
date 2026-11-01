import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import redis from '$lib/server/mem/redis';
import { mooWorld } from '../../../../server/moo-worlds.js';
import { TICKET_PREFIX, TICKET_COOKIE, RELAY_PATH } from '../../../../server/moo-relay.js';

const PER_MINUTE = 10; // tickets an IP address may ask for

// A one-time pass for the relay (server/moo-relay.js): which world. It comes
// back twice, in the reply and in a cookie sent only to the relay, which
// wants both: so only this browser can use it. No sign-in: anyone may use
// /moo, from this site.
export async function POST({ request, url, cookies, getClientAddress }) {
	if (request.headers.get('origin') !== url.origin) error(403, 'Forbidden');
	if (!request.headers.get('content-type')?.startsWith('application/json')) error(415, 'JSON only');
	let ip;
	try {
		ip = getClientAddress();
	} catch (err) {
		// ADDRESS_HEADER names a header the proxy doesn't send (see server/moo-ip.js)
		console.error('[moo-ticket]', (err as Error).message);
		error(503, 'The server cannot tell who you are (its ADDRESS_HEADER is wrong)');
	}
	const key = `moo:tickets:${ip}`;
	const count = await redis.incr(key);
	if (count === 1) await redis.expire(key, 60);
	if (count > PER_MINUTE) error(429, 'Slow down');
	const { world } = await request.json().catch(() => ({}));
	if (!mooWorld(world)) error(400, 'No such world');
	const ticket = randomUUID();
	await redis.set(TICKET_PREFIX + ticket, JSON.stringify({ ip, world }), 'EX', 30);
	cookies.set(TICKET_COOKIE, ticket, {
		path: RELAY_PATH, httpOnly: true, sameSite: 'strict', secure: url.protocol === 'https:', maxAge: 30,
	});
	return json({ ticket });
}
