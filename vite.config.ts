import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
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
});