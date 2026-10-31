import { error, json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import redis from '$lib/server/mem/redis';
import { isRateLimited } from '$lib/server/rateLimit';
import { mooWorld } from '../../../../server/moo-worlds.js';
import { TICKET_PREFIX } from '../../../../server/moo-relay.js';

// A one-time pass for the relay (server/moo-relay.js): who, and which world.
export async function POST({ request, locals }) {
	const session = await locals.auth();
	const user = session?.user as { id?: string; login?: string; name?: string } | undefined;
	if (!user?.id) error(401, 'Sign in first');
	if (await isRateLimited(`moo:${user.id}`)) error(429, 'Slow down');
	const { world } = await request.json().catch(() => ({}));
	if (!mooWorld(world)) error(400, 'No such world');
	const ticket = randomUUID();
	await redis.set(TICKET_PREFIX + ticket, JSON.stringify({
		userId: user.id, login: user.login ?? user.name ?? '', world,
	}), 'EX', 30);
	return json({ ticket });
}
