// The WebSocket <-> telnet relay behind /moo. A browser can't open a TCP
// connection, so the page opens a WebSocket here and this passes its bytes to
// the MOO and back, untouched (MooMoo does the telnet). To get in, the page
// first gets a one-time ticket from /moo/ticket (signed in, rate limited),
// which names the user and the world; tickets live 30 seconds in Redis.
//
// Plain JS, not SvelteKit: it is attached to the HTTP server by server.js in
// production and by a Vite plugin in dev. What players type (passwords
// included) is never logged; only who connected where, and for how long.
import net from 'node:net';
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';
import { mooWorld } from './moo-worlds.js';

export const RELAY_PATH = '/moo/relay';
export const TICKET_PREFIX = 'moo:ticket:';

const MAX_PER_USER = 3;
const MAX_PAYLOAD = 256 * 1024;   // one message from the page: one write
const HIGH_WATER = 1024 * 1024;   // pause the MOO side while the browser lags
const PING_MS = 30_000;

/**
 * @param {import('node:events').EventEmitter} server  an HTTP server (its 'upgrade' events)
 * @param {{ redisUrl: string }} opts
 */
export function attachRelay(server, { redisUrl }) {
	const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
	redis.on('error', (err) => console.error('[moo-relay] redis', err.message));
	const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
	/** @type {Map<string, number>} */
	const perUser = new Map(); // user id -> open connections

	server.on('upgrade', async (req, socket, head) => {
		const url = new URL(req.url ?? '/', 'http://x');
		if (url.pathname !== RELAY_PATH) return; // someone else's (Vite's HMR, say)
		/** @param {number} code @param {string} text */
		const refuse = (code, text) => {
			socket.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
		};
		if (!sameOrigin(req)) return refuse(403, 'Forbidden');
		const id = url.searchParams.get('ticket') ?? '';
		if (!/^[0-9a-f-]{36}$/.test(id)) return refuse(401, 'Unauthorized');
		let ticket;
		try {
			const res = await redis.multi().get(TICKET_PREFIX + id).del(TICKET_PREFIX + id).exec();
			const raw = res?.[0]?.[1];
			ticket = typeof raw === 'string' ? JSON.parse(raw) : null;
		} catch (err) {
			console.error('[moo-relay] ticket', /** @type {Error} */ (err).message);
			return refuse(503, 'Service Unavailable');
		}
		const world = ticket && mooWorld(ticket.world);
		if (!world) return refuse(401, 'Unauthorized');
		if ((perUser.get(ticket.userId) ?? 0) >= MAX_PER_USER) return refuse(429, 'Too Many Requests');
		wss.handleUpgrade(req, socket, head, (ws) => relay(ws, world, ticket));
	});

	/**
	 * @param {import('ws').WebSocket} ws
	 * @param {{ name: string, host: string, port: number }} world
	 * @param {{ userId: string, login?: string }} ticket
	 */
	function relay(ws, world, { userId, login }) {
		perUser.set(userId, (perUser.get(userId) ?? 0) + 1);
		const who = login || userId;
		const started = Date.now();
		let up = 0, down = 0, alive = true, done = false;
		console.log(`[moo-relay] ${who} -> ${world.name} open`);

		const moo = net.connect({ host: world.host, port: world.port });
		moo.setNoDelay(true);
		moo.setKeepAlive(true, 60_000);
		/** @type {Buffer[]} */
		const pending = []; // what the page sent before the MOO side connected
		moo.on('connect', () => { for (const b of pending.splice(0)) moo.write(b); });

		moo.on('data', (buf) => {
			down += buf.length;
			ws.send(buf, { binary: true });
			if (ws.bufferedAmount > HIGH_WATER) {
				moo.pause();
				const wait = setInterval(() => {
					if (done || ws.bufferedAmount < HIGH_WATER / 4) { clearInterval(wait); moo.resume(); }
				}, 50);
			}
		});
		ws.on('message', (data) => {
			const buf = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
			up += buf.length;
			if (moo.connecting) pending.push(buf);
			else moo.write(buf);
		});

		/** @param {string} reason */
		const end = (reason) => {
			if (done) return;
			done = true;
			clearInterval(ping);
			const n = (perUser.get(userId) ?? 1) - 1;
			if (n > 0) perUser.set(userId, n); else perUser.delete(userId);
			moo.destroy();
			if (ws.readyState === ws.OPEN) ws.close(1000, reason.slice(0, 120));
			const secs = Math.round((Date.now() - started) / 1000);
			console.log(`[moo-relay] ${who} -> ${world.name} closed after ${secs}s (${up} up, ${down} down)`);
		};
		moo.on('error', (/** @type {NodeJS.ErrnoException} */ err) => end(`Couldn't reach ${world.name}: ${err.code ?? err.message}`));
		moo.on('close', () => end(`${world.name} closed the connection.`));
		ws.on('close', () => end(''));
		ws.on('error', () => end(''));

		// browsers don't ping; proxies drop quiet sockets
		ws.on('pong', () => { alive = true; });
		const ping = setInterval(() => {
			if (!alive) { ws.terminate(); return; }
			alive = false;
			ws.ping();
		}, PING_MS);
	}

	return wss;
}

// The ticket is what counts; this just turns away other sites' pages.
/** @param {import('node:http').IncomingMessage} req */
function sameOrigin(req) {
	const origin = req.headers.origin;
	if (!origin) return false;
	let host;
	try { host = new URL(origin).host; } catch { return false; }
	const fwd = String(req.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
	return host === req.headers.host || (fwd !== '' && host === fwd);
}
