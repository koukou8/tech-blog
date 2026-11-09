// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { stagingLinks } from './scripts/staging-links.mjs';

const isStaging = process.env.DEPLOY_TARGET === 'staging';
const base = isStaging ? (process.env.PAGES_BASE_PATH || '/tech-blog') : '/';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  base,
  site: isStaging ? (process.env.PAGES_ORIGIN || 'https://koukou8.github.io') : undefined,
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: isStaging ? undefined : cloudflare(),
  markdown: {
    rehypePlugins: isStaging ? [[stagingLinks, { base }]] : [],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
