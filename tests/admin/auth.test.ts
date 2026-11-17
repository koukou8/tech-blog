import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { authorize, requireSameOrigin } from '../../src/admin/auth';
import { ideaSchema, readJson } from '../../src/admin/schema';

const env = {
  ADMIN_ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
  ADMIN_ACCESS_AUD: 'test-audience',
  ADMIN_OWNER_EMAIL: 'owner@example.com',
};
const { privateKey, publicKey } = await generateKeyPair('RS256');
const keySet = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' }],
});
async function token(
  options: { email?: string; aud?: string; exp?: number; issuer?: string } = {},
) {
  return new SignJWT({ email: options.email || env.ADMIN_OWNER_EMAIL })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuedAt()
    .setIssuer(options.issuer || env.ADMIN_ACCESS_ISSUER)
    .setAudience(options.aud || env.ADMIN_ACCESS_AUD)
    .setExpirationTime(options.exp ?? Math.floor(Date.now() / 1000) + 60)
    .sign(privateKey);
}
function request(jwt?: string) {
  return new Request('https://blog.example/admin/', {
    headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {},
  });
}
const status = (expected: number) => (error: unknown) =>
  (error as { status: number }).status === expected;
test('Access signature, issuer, audience, expiry and owner are verified', async () => {
  assert.equal(
    (await authorize(request(await token()), env, { keySet })).email,
    env.ADMIN_OWNER_EMAIL,
  );
  for (const options of [
    { aud: 'wrong' },
    { issuer: 'https://evil.example' },
    { exp: 1 },
  ]) {
    await assert.rejects(
      authorize(request(await token(options)), env, { keySet }),
      status(401),
    );
  }
  const jwt = await token();
  const parts = jwt.split('.');
  parts[2] = `${parts[2][0] === 'a' ? 'b' : 'a'}${parts[2].slice(1)}`;
  await assert.rejects(
    authorize(request(parts.join('.')), env, { keySet }),
    status(401),
  );
  await assert.rejects(
    authorize(request(await token({ email: 'someone@example.com' })), env, {
      keySet,
    }),
    status(403),
  );
  await assert.rejects(authorize(request(), env, { keySet }), status(401));
  await assert.rejects(authorize(request(), {}), status(503));
});
test('development identity requires a development build AND loopback AND an explicit flag', async () => {
  const local = new Request('http://127.0.0.1:4323/admin/');
  assert.equal(
    (
      await authorize(
        local,
        { ADMIN_DEV_AUTH: 'true' },
        { localDevelopment: true },
      )
    ).local,
    true,
  );
  await assert.rejects(
    authorize(local, { ADMIN_DEV_AUTH: 'true' }),
    status(503),
  );
  await assert.rejects(
    authorize(
      request(),
      { ADMIN_DEV_AUTH: 'true' },
      { localDevelopment: true },
    ),
    status(503),
  );
  await assert.rejects(
    authorize(local, {}, { localDevelopment: true }),
    status(503),
  );
});
test('mutations require same-origin JSON and a custom request header', () => {
  const headers = {
    Origin: 'https://blog.example',
    'Content-Type': 'application/json',
    'X-Requested-With': 'IdeaAdmin',
  };
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request('https://blog.example/admin/api/ideas', { headers }),
    ),
  );
  for (const changed of [
    { Origin: 'https://evil.example' },
    { 'X-Requested-With': '' },
    { 'Content-Type': 'text/plain' },
  ]) {
    assert.throws(() =>
      requireSameOrigin(
        new Request('https://blog.example/admin/api/ideas', {
          headers: { ...headers, ...changed },
        }),
      ),
    );
  }
});
test('input limits, statuses and reference URL schemes are validated', async () => {
  const parsed = ideaSchema.parse({
    title: ' title ',
    tags: ['Astro', 'astro'],
    references: ['https://example.com'],
  });
  assert.equal(parsed.title, 'title');
  assert.equal(parsed.tags.length, 1);
  for (const value of [
    { title: '' },
    { title: 'x', status: 'published' },
    { title: 'x', references: ['javascript:alert(1)'] },
    { title: 'x', references: ['https://user:pass@example.com'] },
    { title: 'x', unknown: true },
    { title: 'x', revision: 0 },
  ])
    assert.equal(ideaSchema.safeParse(value).success, false);
  await assert.rejects(
    readJson(
      new Request('http://localhost', {
        method: 'POST',
        body: 'x'.repeat(300001),
      }),
    ),
    status(413),
  );
  await assert.rejects(
    readJson(
      new Request('http://localhost', { method: 'POST', body: 'invalid' }),
    ),
    status(400),
  );
});
