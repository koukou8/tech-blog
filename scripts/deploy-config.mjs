import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function deploymentConfig(base, env) {
  const names = [
    'IDEAS_DB_ID',
    'ADMIN_ACCESS_ISSUER',
    'ADMIN_ACCESS_AUD',
    'ADMIN_OWNER_EMAIL',
  ];
  const values = Object.fromEntries(
    names.map((name) => [name, (env[name] || '').trim()]),
  );
  const configured = names.filter((name) => values[name]);
  if (!configured.length) return { ...base };
  if (configured.length !== names.length)
    throw new Error(
      'Set all four admin production variables, or leave all four unset.',
    );
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      values.IDEAS_DB_ID,
    )
  )
    throw new Error('IDEAS_DB_ID must be a D1 UUID.');
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
      values.ADMIN_ACCESS_ISSUER,
    )
  )
    throw new Error(
      'ADMIN_ACCESS_ISSUER must be the Access team URL without a trailing slash.',
    );
  if (!/^[a-f0-9]{64}$/i.test(values.ADMIN_ACCESS_AUD))
    throw new Error(
      'ADMIN_ACCESS_AUD must be the Access application audience.',
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.ADMIN_OWNER_EMAIL))
    throw new Error('ADMIN_OWNER_EMAIL must be your allowed email address.');
  const { IDEAS_DB_ID, ...vars } = values;
  return {
    ...base,
    d1_databases: [
      {
        binding: 'IDEAS_DB',
        database_name: 'tech-blog-ideas',
        database_id: IDEAS_DB_ID,
        migrations_dir: 'migrations',
      },
    ],
    vars: { ...base.vars, ...vars },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const base = JSON.parse(
    await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'),
  );
  const config = deploymentConfig(base, process.env);
  await writeFile(
    new URL('../wrangler.deploy.jsonc', import.meta.url),
    `${JSON.stringify(config, null, 2)}\n`,
  );
  console.log(
    config.d1_databases
      ? 'Production admin configuration enabled.'
      : 'Admin unconfigured: private routes will return 503; public blog remains available.',
  );
}
