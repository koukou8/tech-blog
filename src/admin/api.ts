import type { APIContext } from 'astro';
import { authorize, privateHeaders, requireSameOrigin } from './auth';
import { ideaSchema, readJson, revisionSchema } from './schema';
import { deleteIdea, getIdea, listIdeas, saveIdea } from './store';
import { AdminError, type AdminEnv } from './types';

export const prerender = false;
export async function handleAdminApi(
  request: Request,
  path: string,
  env: AdminEnv,
  localDevelopment = false,
) {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  try {
    await authorize(request, env, { localDevelopment });
    if (!env.IDEAS_DB)
      throw new AdminError(503, '保存先の設定が完了していません。');
    const parts = path.replace(/\/$/, '').split('/');
    if (parts[0] !== 'ideas' || parts.length > 2)
      throw new AdminError(404, '見つかりません。');
    const id = parts[1];
    if (id && !/^[0-9a-f-]{36}$/.test(id))
      throw new AdminError(404, '見つかりません。');
    if (request.method === 'GET')
      return json(
        id
          ? await getIdea(env.IDEAS_DB, id)
          : await listIdeas(env.IDEAS_DB, new URL(request.url).searchParams),
      );
    if (!['POST', 'PUT', 'DELETE'].includes(request.method))
      throw new AdminError(405, 'この操作は利用できません。');
    requireSameOrigin(request);
    const body = await readJson(request);
    if (request.method === 'POST' && !id) {
      const parsed = ideaSchema.safeParse(body);
      if (!parsed.success)
        throw new AdminError(
          400,
          'タイトル・タグ・参考URLの入力内容を確認してください。',
        );
      return json(await saveIdea(env.IDEAS_DB, parsed.data), 201);
    }
    if (request.method === 'PUT' && id) {
      const parsed = ideaSchema.safeParse(body);
      if (!parsed.success || !parsed.data.revision)
        throw new AdminError(400, '入力内容と更新情報を確認してください。');
      return json(
        await saveIdea(env.IDEAS_DB, parsed.data, {
          id,
          revision: parsed.data.revision,
        }),
      );
    }
    if (request.method === 'DELETE' && id) {
      const parsed = revisionSchema.safeParse(body);
      if (!parsed.success)
        throw new AdminError(400, '更新情報を確認してください。');
      await deleteIdea(env.IDEAS_DB, id, parsed.data.revision);
      return json({ deleted: true });
    }
    throw new AdminError(405, 'この操作は利用できません。');
  } catch (error) {
    if (error instanceof AdminError)
      return json({ error: error.message }, error.status);
    console.error(
      'Article ideas request failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return json(
      {
        error: '保存先に接続できませんでした。時間をおいて再度お試しください。',
      },
      503,
    );
  }
}
export const ALL = ({ request, params, locals }: APIContext) =>
  handleAdminApi(
    request,
    params.path || '',
    locals.runtime?.env || {},
    import.meta.env.DEV,
  );
