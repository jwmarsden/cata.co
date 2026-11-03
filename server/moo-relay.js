// The WebSocket <-> telnet relay behind /moo. A browser can't open a TCP
// connection, so the page opens a WebSocket here and this passes its bytes to
// the MOO and back, untouched (moocat does the telnet).
//
// Anyone may use /moo, so the relay's job is to be no use for anything else:
//  - it reaches only the worlds in moo-worlds.js, chosen by name, never by a
//    host or port from the client;
//  - only this site's pages can open it (Origin), and only with a one-time
//    ticket from /moo/ticket, which lives 30 seconds and works only from the
//    browser that asked for it: it comes back as a cookie too, sent only
//    here, and the two must match (IP addresses can't do this: a browser may
//    ask over IPv6 and connect over IPv4, and proxies muddle them);
//  - each IP address gets a few connections, the whole relay a fixed number;
//  - what goes to the MOO is rate limited (typing and @edit fit easily), and
//    connections where nothing is typed for hours are closed.
//
// Plain JS, not SvelteKit: it is attached to the HTTP server by server.js in
// production and by a Vite plugin in dev. What players type (passwords
// included) is never logged; only where connections came from and went, and
// for how long.
import net from 'node:net';
import tls from 'node:tls';
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';
import { mooWorld } from './moo-worlds.js';
import { clientIp } from './moo-ip.js';

export const RELAY_PATH = '/moo/relay';
export const TICKET_PREFIX = 'moo:ticket:';
export const TICKET_COOKIE = 'moo_ticket';

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
	/** @type {Set<(reason: string, how?: { why?: string, code?: number, kill?: boolean }) => void>} */
	const open = new Set(); // each connection's end(), for shutdown

	server.on('upgrade', async (req, socket, head) => {
		const url = new URL(req.url ?? '/', 'http://x');
		if (url.pathname !== RELAY_PATH) return; // someone else's (Vite's HMR, say)
		/** @param {number} code @param {string} text @param {string} [why] */
		const refuse = (code, text, why = '') => {
			console.log(`[moo-relay] refused ${code}${why ? ': ' + why : ''}`);
			socket.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
		};
		if (!sameOrigin(req)) return refuse(403, 'Forbidden', `origin ${req.headers.origin ?? 'none'} for host ${req.headers.host}`);
		const ip = clientIp(req, { addressHeader, xffDepth });
		if (!ip) return refuse(400, 'Bad Request', `no client address (ADDRESS_HEADER ${addressHeader || 'unset'})`);
		const id = url.searchParams.get('ticket') ?? '';
		if (!/^[0-9a-f-]{36}$/.test(id)) return refuse(401, 'Unauthorized', 'no ticket');
		// the same browser: its ticket cookie (from /moo/ticket) is this ticket
		if (cookie(req, TICKET_COOKIE) !== id) return refuse(401, 'Unauthorized', 'ticket cookie missing or different');
		let ticket;
		try {
			const res = await redis.multi().get(TICKET_PREFIX + id).del(TICKET_PREFIX + id).exec();
			const raw = res?.[0]?.[1];
			ticket = typeof raw === 'string' ? JSON.parse(raw) : null;
		} catch (err) {
			console.error('[moo-relay] ticket', /** @type {Error} */ (err).message);
			return refuse(503, 'Service Unavailable');
		}
		if (!ticket) return refuse(401, 'Unauthorized', 'no such ticket (used, or over 30 s old)');
		const world = mooWorld(ticket.world);
		if (!world) return refuse(401, 'Unauthorized', `no world ${ticket.world}`);
		if ((perIp.get(ip) ?? 0) >= MAX_PER_IP) return refuse(429, 'Too Many Requests', `${ip} has ${MAX_PER_IP} open`);
		if (total >= MAX_TOTAL) return refuse(503, 'Service Unavailable', `${MAX_TOTAL} open in all`);
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
	 * @param {{ name: string, host: string, port: number, tls?: boolean }} world
	 * @param {string} ip
	 */
	function relay(ws, world, ip) {
		const started = Date.now();
		let up = 0, down = 0, alive = true, done = false;
		let lastInput = Date.now(), lastOutput = Date.now();
		console.log(`[moo-relay] ${ip} -> ${world.name} open (${total} open)`);

		// TLS worlds are checked against the system's CAs, as a browser would
		const moo = world.tls
			? tls.connect({ host: world.host, port: world.port, servername: world.host })
			: net.connect({ host: world.host, port: world.port });
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
		moo.on(world.tls ? 'secureConnect' : 'connect', drain);

		moo.on('data', (buf) => {
			down += buf.length;
			lastOutput = Date.now();
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

		// reason: told to the browser (when it's still there) and logged; why:
		// logged only, for closes the browser started or can't hear
		/**
		 * @param {string} reason
		 * @param {{ why?: string, code?: number, kill?: boolean }} [how]
		 */
		const end = (reason, { why = '', code = 1000, kill = false } = {}) => {
			if (done) return;
			done = true;
			open.delete(end);
			clearInterval(ping);
			if (drainTimer) clearTimeout(drainTimer);
			release(ip);
			moo.destroy();
			if (kill) ws.terminate();
			else if (ws.readyState === ws.OPEN) ws.close(code, reason.slice(0, 120));
			const now = Date.now();
			const s = (/** @type {number} */ t) => `${Math.round((now - t) / 1000)}s`;
			console.log(`[moo-relay] ${ip} -> ${world.name} closed after ${s(started)} ` +
				`(${up} up, ${down} down; last typed ${s(lastInput)} ago, last from the MOO ${s(lastOutput)} ago): ` +
				(why || reason || 'no reason'));
		};
		open.add(end);
		moo.on('error', (/** @type {NodeJS.ErrnoException} */ err) =>
			end(`Couldn't reach ${world.name}: ${err.code ?? err.message}`, { why: `MOO socket error ${err.code ?? err.message}` }));
		moo.on('close', () => end(`${world.name} closed the connection.`, { why: 'the MOO closed it' }));
		ws.on('close', (code, why) =>
			end('', { why: `the browser closed it (code ${code}${why.length ? ', ' + why.toString() : ''})` }));
		ws.on('error', (err) => end('', { why: `browser socket error: ${err.message}` }));

		// browsers don't ping; proxies drop quiet sockets. And nothing typed
		// for IDLE_MS: close, so abandoned tabs don't hold places.
		ws.on('pong', () => { alive = true; });
		const ping = setInterval(() => {
			if (Date.now() - lastInput > IDLE_MS) return end('Closed after two hours with nothing typed.');
			if (!alive) return end('', { why: `no answer to a ping in ${PING_MS / 1000}s: the browser or the network went away`, kill: true });
			alive = false;
			ws.ping();
		}, PING_MS);
	}

	// before the server stops (a deploy): tell each browser, so it can say so
	/** @param {string} reason */
	const shutdown = (reason) => {
		console.log(`[moo-relay] shutting down with ${open.size} open`);
		for (const end of [...open]) end(reason, { why: 'the server is shutting down', code: 1012 });
	};

	return Object.assign(wss, { shutdown });
}

/** @param {import('node:http').IncomingMessage} req @param {string} name */
function cookie(req, name) {
	for (const part of String(req.headers.cookie ?? '').split(';')) {
		const [k, ...v] = part.trim().split('=');
		if (k === name) return decodeURIComponent(v.join('='));
	}
	return null;
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
