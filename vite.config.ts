import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
			onwarn(warning, warn) {
				// Suppress known drizzle-orm circular dependency warning
				if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('drizzle-orm')) {
					return;
				}
				warn(warning);
			}
		}
	}
});
