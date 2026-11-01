// The WebSocket <-> telnet relay behind /moo. A browser can't open a TCP
// connection, so the page opens a WebSocket here and this passes its bytes to
// the MOO and back, untouched (MooMoo does the telnet).
//
// Anyone may use /moo, so the relay's job is to be no use for anything else:
//  - it reaches only the worlds in moo-worlds.js, chosen by name, never by a
//    host or port from the client;
//  - only this site's pages can open it (Origin), and only with a one-time
//    ticket from /moo/ticket, which lives 30 seconds and works only from the
//    IP address that asked for it;
//  - each IP address gets a few connections, the whole relay a fixed number;
//  - what goes to the MOO is rate limited (typing and @edit fit easily), and
//    connections where nothing is typed for hours are closed.
//
// Plain JS, not SvelteKit: it is attached to the HTTP server by server.js in
// production and by a Vite plugin in dev. What players type (passwords
// included) is never logged; only where connections came from and went, and
// for how long.
import net from 'node:net';
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';
import { mooWorld } from './moo-worlds.js';
import { clientIp } from './moo-ip.js';

export const RELAY_PATH = '/moo/relay';
export const TICKET_PREFIX = 'moo:ticket:';

const MAX_PER_IP = 3;
const MAX_TOTAL = 50;
const MAX_PAYLOAD = 256 * 1024;      // one message from the page: one write
const HIGH_WATER = 1024 * 1024;      // pause the MOO side while the browser lags
const PING_MS = 30_000;
const UP_BURST = 64 * 1024;          // to the MOO: this much at once,
const UP_RATE = 8 * 1024;            // then this many bytes a second
const UP_QUEUE_MAX = 512 * 1024;     // more than this waiting: drop the connection
const IDLE_MS = 2 * 60 * 60 * 1000;  // nothing typed for this long: close

/**
 * @param {import('node:events').EventEmitter} server  an HTTP server (its 'upgrade' events)
 * @param {{ redisUrl: string, addressHeader?: string, xffDepth?: number }} opts
 */
export function attachRelay(server, { redisUrl, addressHeader = '', xffDepth = 1 }) {
	const redis = new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
	redis.on('error', (err) => console.error('[moo-relay] redis', err.message));
	const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD });
	/** @type {Map<string, number>} */
	const perIp = new Map(); // ip -> open connections
	let total = 0;

	server.on('upgrade', async (req, socket, head) => {
		const url = new URL(req.url ?? '/', 'http://x');
		if (url.pathname !== RELAY_PATH) return; // someone else's (Vite's HMR, say)
		/** @param {number} code @param {string} text */
		const refuse = (code, text) => {
			socket.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
		};
		if (!sameOrigin(req)) return refuse(403, 'Forbidden');
		const ip = clientIp(req, { addressHeader, xffDepth });
		if (!ip) return refuse(400, 'Bad Request');
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
		// a ticket works only from where it was asked for
		const world = ticket && ticket.ip === ip && mooWorld(ticket.world);
		if (!world) return refuse(401, 'Unauthorized');
		if ((perIp.get(ip) ?? 0) >= MAX_PER_IP) return refuse(429, 'Too Many Requests');
		if (total >= MAX_TOTAL) return refuse(503, 'Service Unavailable');
		// counted now, not once the upgrade completes, so a burst can't slip past;
		// released when the connection ends, or if the handshake fails
		take(ip);
		let upgraded = false;
		socket.once('close', () => { if (!upgraded) release(ip); });
		wss.handleUpgrade(req, socket, head, (ws) => { upgraded = true; relay(ws, world, ip); });
	});

	/** @param {string} ip */
	const take = (ip) => { perIp.set(ip, (perIp.get(ip) ?? 0) + 1); total++; };
	/** @param {string} ip */
	const release = (ip) => {
		const n = (perIp.get(ip) ?? 1) - 1;
		if (n > 0) perIp.set(ip, n); else perIp.delete(ip);
		total--;
	};

	/**
	 * @param {import('ws').WebSocket} ws
	 * @param {{ name: string, host: string, port: number }} world
	 * @param {string} ip
	 */
	function relay(ws, world, ip) {
		const started = Date.now();
		let up = 0, down = 0, alive = true, done = false;
		let lastInput = Date.now();
		console.log(`[moo-relay] ${ip} -> ${world.name} open (${total} open)`);

		const moo = net.connect({ host: world.host, port: world.port });
		moo.setNoDelay(true);
		moo.setKeepAlive(true, 60_000);

		// to the MOO, through a token bucket: UP_BURST at once, UP_RATE a second
		let tokens = UP_BURST, refilled = Date.now(), queued = 0;
		/** @type {Buffer[]} */
		const queue = [];
		/** @type {NodeJS.Timeout | null} */
		let drainTimer = null;
		const drain = () => {
			drainTimer = null;
			const now = Date.now();
			tokens = Math.min(UP_BURST, tokens + ((now - refilled) / 1000) * UP_RATE);
			refilled = now;
			while (queue.length && !moo.connecting) {
				const b = queue[0];
				if (b.length > tokens) {
					if (tokens < UP_BURST) break; // wait for more
					// bigger than the whole burst (up to MAX_PAYLOAD): send what's allowed
					const n = Math.floor(tokens);
					moo.write(b.subarray(0, n));
					queue[0] = b.subarray(n);
					queued -= n;
					tokens -= n;
					break;
				}
				moo.write(b);
				queue.shift();
				queued -= b.length;
				tokens -= b.length;
			}
			if (queue.length && !done) drainTimer = setTimeout(drain, 100);
		};
		moo.on('connect', drain);

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
			lastInput = Date.now();
			queue.push(buf);
			queued += buf.length;
			if (queued > UP_QUEUE_MAX) return end('Too much input: slow down.');
			if (!drainTimer) drain();
		});

		/** @param {string} reason */
		const end = (reason) => {
			if (done) return;
			done = true;
			clearInterval(ping);
			if (drainTimer) clearTimeout(drainTimer);
			release(ip);
			moo.destroy();
			if (ws.readyState === ws.OPEN) ws.close(1000, reason.slice(0, 120));
			const secs = Math.round((Date.now() - started) / 1000);
			console.log(`[moo-relay] ${ip} -> ${world.name} closed after ${secs}s (${up} up, ${down} down)${reason ? ': ' + reason : ''}`);
		};
		moo.on('error', (/** @type {NodeJS.ErrnoException} */ err) => end(`Couldn't reach ${world.name}: ${err.code ?? err.message}`));
		moo.on('close', () => end(`${world.name} closed the connection.`));
		ws.on('close', () => end(''));
		ws.on('error', () => end(''));

		// browsers don't ping; proxies drop quiet sockets. And nothing typed
		// for IDLE_MS: close, so abandoned tabs don't hold places.
		ws.on('pong', () => { alive = true; });
		const ping = setInterval(() => {
			if (Date.now() - lastInput > IDLE_MS) return end('Closed after two hours with nothing typed.');
			if (!alive) { ws.terminate(); return; }
			alive = false;
			ws.ping();
		}, PING_MS);
	}

	return wss;
}

// The ticket is what counts; this turns away other sites' pages, which a
// browser can't lie about (scripts can, which is what the rest is for).
/** @param {import('node:http').IncomingMessage} req */
function sameOrigin(req) {
	const origin = req.headers.origin;
	if (!origin) return false;
	let host;
	try { host = new URL(origin).host; } catch { return false; }
	const fwd = String(req.headers['x-forwarded-host'] ?? '').split(',')[0].trim();
	return host === req.headers.host || (fwd !== '' && host === fwd);
}
