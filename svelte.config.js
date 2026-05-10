import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter(),
    typescript: {
      config: (config) => ({
        ...config,
        include: [...config.include, '../drizzle.config.ts']
      })
    }
  }
};
