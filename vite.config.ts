import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { attachRelay } from './server/moo-relay.js';

// In dev, the /moo relay rides on Vite's server (server.js does it in production).
const mooRelay = (redisUrl: string): Plugin => ({
	name: 'moo-relay',
	configureServer(server) {
		if (server.httpServer) attachRelay(server.httpServer, { redisUrl });
	}
});

export default defineConfig(({ mode }) => ({
	plugins: [
		tailwindcss(),
		sveltekit(),
		mooRelay(loadEnv(mode, process.cwd(), '').REDIS_URL),
	],
	build: {
		rollupOptions: {
			onwarn(warning, warn) {
				if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('drizzle-orm')) {
					return;
				}
				warn(warning);
			}
		}
	}
}));
