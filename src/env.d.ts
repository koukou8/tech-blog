/// <reference types="astro/client" />
type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<
  import('./admin/types').AdminEnv
>;
declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
