import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlatformProxy } from 'wrangler';
import type { AdminEnv, Idea, IdeaList } from '../../src/admin/types';
import { handleAdminApi } from '../../src/admin/api';

let proxy: Awaited<ReturnType<typeof getPlatformProxy<AdminEnv>>>;
let env: AdminEnv;
before(async () => {
  proxy = await getPlatformProxy<AdminEnv>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  env = { ...proxy.env, ADMIN_DEV_AUTH: 'true' };
  const sql = await readFile('migrations/0001_article_ideas.sql', 'utf8');
  await env.IDEAS_DB!.batch(
    sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => env.IDEAS_DB!.prepare(s)),
  );
});
after(async () => {
  await proxy?.dispose();
});
function call(path = 'ideas', method = 'GET', body?: unknown, headers = {}) {
  return handleAdminApi(
    new Request(`http://localhost/admin/api/${path}`, {
      method,
      headers: {
        Origin: 'http://localhost',
        'Content-Type': 'application/json',
        'X-Requested-With': 'IdeaAdmin',
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    path.split('?')[0],
    env,
    true,
  );
}
const input = {
  title: 'Cloudflare D1 を調べる',
  notes: '日本語メモ 100% _test',
  status: 'research',
  tags: ['Cloudflare', 'D1'],
  references: ['https://developers.cloudflare.com/d1/'],
};
test('real D1 CRUD, filters, search and optimistic conflicts preserve relations', async () => {
  const response = await call('ideas', 'POST', input);
  assert.equal(response.status, 201);
  assert.match(response.headers.get('Cache-Control')!, /no-store/);
  let idea: Idea = await response.json();
  assert.equal(idea.revision, 1);
  assert.equal(idea.tags.length, 2);
  for (const query of [
    'q=日本語',
    'q=100%25',
    'q=_test',
    'q=D1&status=research&tag=cloudflare',
  ]) {
    const result: IdeaList = await (await call(`ideas?${query}`)).json();
    assert.equal(result.total, 1, query);
  }
  assert.equal((await (await call('ideas?status=done')).json()).total, 0);
  const updated = await call(`ideas/${idea.id}`, 'PUT', {
    ...input,
    title: '<script>plain text</script>',
    tags: ['Astro'],
    references: ['https://example.com'],
    revision: 1,
  });
  assert.equal(updated.status, 200);
  idea = await updated.json();
  assert.equal(idea.revision, 2);
  const stale = await call(`ideas/${idea.id}`, 'PUT', {
    ...input,
    tags: ['MustNotExist'],
    revision: 1,
  });
  assert.equal(stale.status, 409);
  assert.equal(
    (await call(`ideas/${idea.id}`, 'DELETE', { revision: 1 })).status,
    409,
  );
  const preserved: Idea = await (await call(`ideas/${idea.id}`)).json();
  assert.deepEqual(preserved.tags, ['Astro']);
  assert.deepEqual(preserved.references, ['https://example.com']);
  const all: IdeaList = await (await call('ideas')).json();
  assert.deepEqual(all.tags, ['Astro']);
  assert.equal(all.counts.research, 1);
  assert.equal(
    (await call(`ideas/${idea.id}`, 'DELETE', { revision: 2 })).status,
    200,
  );
  assert.equal((await call(`ideas/${idea.id}`)).status, 404);
  assert.equal((await (await call('ideas')).json()).total, 0);
  assert.equal(
    (
      await env
        .IDEAS_DB!.prepare('SELECT count(*) AS n FROM idea_references')
        .first<{ n: number }>()
    )?.n,
    0,
  );
});
test('API rejects unauthorized, cross-origin, invalid and unconfigured requests', async () => {
  const request = new Request('http://localhost/admin/api/ideas');
  assert.equal(
    (await handleAdminApi(request, 'ideas', env, false)).status,
    503,
  );
  assert.equal(
    (
      await handleAdminApi(
        request,
        'ideas',
        {
          ...env,
          ADMIN_ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
          ADMIN_ACCESS_AUD: 'aud',
          ADMIN_OWNER_EMAIL: 'owner@example.com',
        },
        false,
      )
    ).status,
    401,
  );
  assert.equal(
    (await handleAdminApi(request, 'ideas', { ADMIN_DEV_AUTH: 'true' }, true))
      .status,
    503,
  );
  assert.equal(
    (await call('ideas', 'POST', input, { Origin: 'https://evil.example' }))
      .status,
    403,
  );
  assert.equal((await call('ideas', 'POST', { title: '' })).status, 400);
  assert.equal(
    (
      await call('ideas', 'POST', {
        ...input,
        references: ['javascript:alert(1)'],
      })
    ).status,
    400,
  );
  assert.equal((await call('ideas/not-a-uuid')).status, 404);
  assert.equal((await call('ideas', 'PATCH', {})).status, 405);
});
test('simultaneous saves have exactly one winner and consistent related data', async () => {
  const idea: Idea = await (await call('ideas', 'POST', input)).json();
  const variants = ['First', 'Second'].map(name => ({
    ...input,
    title: name,
    tags: [name],
    references: [`https://example.com/${name}`],
    revision: 1,
  }));
  const responses = await Promise.all(variants.map(value => call(`ideas/${idea.id}`, 'PUT', value)));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const saved: Idea = await (await call(`ideas/${idea.id}`)).json();
  const winner = variants[responses.findIndex(response => response.status === 200)];
  assert.equal(saved.title, winner.title);
  assert.deepEqual(saved.tags, winner.tags);
  assert.deepEqual(saved.references, winner.references);
  assert.equal(saved.revision, 2);
  assert.equal((await call(`ideas/${idea.id}`, 'DELETE', { revision: 2 })).status, 200);
});

test('pagination is bounded and empty pages are clamped', async () => {
  const db = env.IDEAS_DB!;
  await db.batch(
    Array.from({ length: 51 }, (_, i) =>
      db
        .prepare(
          'INSERT INTO ideas(id,title,notes,status,created_at,updated_at,revision,write_token) VALUES(?,?,?,?,?,?,1,?)',
        )
        .bind(
          crypto.randomUUID(),
          `Item ${String(i).padStart(2, '0')}`,
          '',
          'idea',
          '2026-01-01',
          '2026-01-01',
          crypto.randomUUID(),
        ),
    ),
  );
  const first: IdeaList = await (await call('ideas?sort=title')).json();
  const second: IdeaList = await (
    await call('ideas?page=999&sort=title')
  ).json();
  assert.equal(first.items.length, 50);
  assert.equal(second.items.length, 1);
  assert.equal(second.page, 2);
  assert.equal((await (await call('ideas?page=-1')).json()).page, 1);
  assert.equal(
    (await (await call('ideas?q=%27%20OR%201%3D1--')).json()).total,
    0,
  );
});
