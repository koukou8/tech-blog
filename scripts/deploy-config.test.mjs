import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfig } from './deploy-config.mjs';

const base = {
  name: 'tech-blog',
  main: 'dist/_worker.js/index.js',
  assets: { directory: './dist' },
};
const env = {
  IDEAS_DB_ID: '12345678-1234-4234-8234-123456789abc',
  ADMIN_ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
  ADMIN_ACCESS_AUD: 'a'.repeat(64),
  ADMIN_OWNER_EMAIL: 'owner@example.com',
};
test('unconfigured admin leaves the public Worker deployable', () =>
  assert.deepEqual(deploymentConfig(base, {}), base));
test('configured admin binds D1 and three identity variables, never a local bypass', () => {
  const config = deploymentConfig(base, { ...env, ADMIN_DEV_AUTH: 'true' });
  assert.equal(config.name, 'tech-blog');
  assert.equal(config.d1_databases[0].binding, 'IDEAS_DB');
  assert.equal(config.vars.ADMIN_OWNER_EMAIL, env.ADMIN_OWNER_EMAIL);
  assert.equal(config.vars.ADMIN_DEV_AUTH, undefined);
  assert.equal(base.d1_databases, undefined);
});
test('partial or malformed production configuration fails before deployment', () => {
  assert.throws(() => deploymentConfig(base, { IDEAS_DB_ID: env.IDEAS_DB_ID }));
  for (const key of Object.keys(env))
    assert.throws(() => deploymentConfig(base, { ...env, [key]: 'invalid' }));
});
