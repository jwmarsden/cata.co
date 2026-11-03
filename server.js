// Production entry: SvelteKit's handler (adapter-node) plus the /moo relay
// on the same HTTP server. `npm start` runs this rather than build/index.js.
import http from 'node:http';
import { handler } from './build/handler.js';
import { attachRelay } from './server/moo-relay.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = http.createServer(handler);
// The relay limits clients by IP address, so behind a reverse proxy it needs
// the proxy's client-address header, as SvelteKit does (see server/moo-ip.js).
if (!process.env.ADDRESS_HEADER) {
	console.warn('[moo-relay] ADDRESS_HEADER is not set: behind a proxy, every client will look like the proxy');
}
const relay = attachRelay(server, {
	redisUrl: process.env.REDIS_URL,
	addressHeader: process.env.ADDRESS_HEADER,
	xffDepth: Number(process.env.XFF_DEPTH ?? 1),
});
server.listen(port, host, () => console.log(`Listening on http://${host}:${port}`));

const shutdown = () => {
	relay.shutdown('cata.co is restarting: connect again in a moment.');
	server.close(() => process.exit(0));
	server.closeAllConnections();
	setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
