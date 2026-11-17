import { fileURLToPath } from 'node:url';

export function adminIntegration() {
  return {
    name: 'article-ideas-admin',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({
          pattern: '/admin',
          entrypoint: fileURLToPath(
            new URL('../src/admin/index.astro', import.meta.url),
          ),
          prerender: false,
        });
        injectRoute({
          pattern: '/admin/api/[...path]',
          entrypoint: fileURLToPath(
            new URL('../src/admin/api.ts', import.meta.url),
          ),
          prerender: false,
        });
      },
    },
  };
}
