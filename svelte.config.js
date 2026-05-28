import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
			bodySize: 50 * 1024 * 1024  // 50MB
		}),
    typescript: {
      config: (config) => ({
        ...config,
        include: [...config.include, '../drizzle.config.ts']
      })
    }
  }
};
