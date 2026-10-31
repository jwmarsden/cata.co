// Production entry: SvelteKit's handler (adapter-node) plus the /moo relay
// on the same HTTP server. `npm start` runs this rather than build/index.js.
import http from 'node:http';
import { handler } from './build/handler.js';
import { attachRelay } from './server/moo-relay.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const server = http.createServer(handler);
attachRelay(server, { redisUrl: process.env.REDIS_URL });
server.listen(port, host, () => console.log(`Listening on http://${host}:${port}`));

const shutdown = () => {
	server.close(() => process.exit(0));
	server.closeAllConnections();
	setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
