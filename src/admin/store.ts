import type { D1Database } from '@cloudflare/workers-types';
import {
  AdminError,
  type Idea,
  type IdeaInput,
  type IdeaList,
  type Status,
} from './types';

const select = `SELECT i.id, i.title, i.notes, i.status, i.created_at, i.updated_at, i.revision,
  (SELECT json_group_array(name) FROM (SELECT t.name FROM tags t JOIN idea_tags it ON it.tag_id=t.id WHERE it.idea_id=i.id ORDER BY t.name)) AS tags,
  (SELECT json_group_array(url) FROM (SELECT url FROM idea_references r WHERE r.idea_id=i.id ORDER BY r.sort_order)) AS refs
  FROM ideas i`;
function unpack(row: Record<string, unknown>): Idea {
  const { refs, tags, ...idea } = row;
  return {
    ...idea,
    tags: JSON.parse(String(tags || '[]')),
    references: JSON.parse(String(refs || '[]')),
  } as Idea;
}
export async function getIdea(db: D1Database, id: string) {
  const row = await db
    .prepare(`${select} WHERE i.id=?`)
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) throw new AdminError(404, 'アイデアが見つかりません。');
  return unpack(row);
}
export async function listIdeas(
  db: D1Database,
  params: URLSearchParams,
): Promise<IdeaList> {
  const search = (params.get('q') || '').trim().slice(0, 200);
  const status = params.get('status') || '';
  const tag = params.get('tag') || '';
  const clauses = ['1=1'];
  const values: string[] = [];
  if (search) {
    const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    clauses.push(
      `(i.title LIKE ? ESCAPE '\\' OR i.notes LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM idea_tags it JOIN tags t ON t.id=it.tag_id WHERE it.idea_id=i.id AND t.name LIKE ? ESCAPE '\\'))`,
    );
    values.push(like, like, like);
  }
  if (status) {
    clauses.push('i.status=?');
    values.push(status);
  }
  if (tag) {
    clauses.push(
      'EXISTS (SELECT 1 FROM idea_tags it JOIN tags t ON t.id=it.tag_id WHERE it.idea_id=i.id AND t.name=? COLLATE NOCASE)',
    );
    values.push(tag);
  }
  const where = clauses.join(' AND ');
  const order =
    (
      {
        updated: 'i.updated_at DESC, i.id',
        created: 'i.created_at DESC, i.id',
        title: 'i.title COLLATE NOCASE, i.id',
      } as Record<string, string>
    )[params.get('sort') || 'updated'] || 'i.updated_at DESC, i.id';
  const pageSize = 50;
  const total = Number(
    (
      await db
        .prepare(`SELECT count(*) AS n FROM ideas i WHERE ${where}`)
        .bind(...values)
        .first<{ n: number }>()
    )?.n || 0,
  );
  const requested = Number(params.get('page') || 1);
  const page = Math.max(
    1,
    Math.min(
      Number.isSafeInteger(requested) ? requested : 1,
      Math.max(1, Math.ceil(total / pageSize)),
    ),
  );
  const rows = await db
    .prepare(`${select} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...values, pageSize, (page - 1) * pageSize)
    .all<Record<string, unknown>>();
  const counts = { idea: 0, research: 0, writing: 0, done: 0 };
  const statusRows = await db
    .prepare('SELECT status, count(*) AS n FROM ideas GROUP BY status')
    .all<{ status: Status; n: number }>();
  for (const row of statusRows.results) counts[row.status] = row.n;
  const tags = await db
    .prepare(
      'SELECT DISTINCT t.name FROM tags t JOIN idea_tags it ON it.tag_id=t.id ORDER BY t.name',
    )
    .all<{ name: string }>();
  return {
    items: rows.results.map(unpack),
    total,
    page,
    pageSize,
    counts,
    tags: tags.results.map((t) => t.name),
  };
}

export async function saveIdea(
  db: D1Database,
  input: IdeaInput,
  existing?: { id: string; revision: number },
) {
  const id = existing?.id || crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  const first = existing
    ? db
        .prepare(
          'UPDATE ideas SET title=?, notes=?, status=?, updated_at=?, revision=revision+1, write_token=? WHERE id=? AND revision=?',
        )
        .bind(
          input.title,
          input.notes,
          input.status,
          now,
          token,
          id,
          existing.revision,
        )
    : db
        .prepare(
          'INSERT INTO ideas (id,title,notes,status,created_at,updated_at,revision,write_token) VALUES (?,?,?,?,?,?,1,?)',
        )
        .bind(id, input.title, input.notes, input.status, now, now, token);
  // The token gates every related write, even when a stale revision loses a race.
  const guard = 'EXISTS (SELECT 1 FROM ideas WHERE id=? AND write_token=?)';
  const statements = [
    first,
    db
      .prepare(`DELETE FROM idea_tags WHERE idea_id=? AND ${guard}`)
      .bind(id, id, token),
    db
      .prepare(`DELETE FROM idea_references WHERE idea_id=? AND ${guard}`)
      .bind(id, id, token),
  ];
  for (const tag of input.tags) {
    statements.push(
      db
        .prepare(
          `INSERT INTO tags(name) SELECT ? WHERE ${guard} ON CONFLICT(name) DO NOTHING`,
        )
        .bind(tag, id, token),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO idea_tags(idea_id,tag_id) SELECT ?,id FROM tags WHERE name=? COLLATE NOCASE AND ${guard}`,
        )
        .bind(id, tag, id, token),
    );
  }
  input.references.forEach((url, index) =>
    statements.push(
      db
        .prepare(
          `INSERT INTO idea_references(idea_id,url,sort_order) SELECT ?,?,? WHERE ${guard}`,
        )
        .bind(id, url, index, id, token),
    ),
  );
  const results = await db.batch(statements);
  if (!results[0].meta.changes) {
    await getIdea(db, id);
    throw new AdminError(
      409,
      '別の画面で更新されています。入力内容を控えてから最新の内容を読み込んでください。',
    );
  }
  return getIdea(db, id);
}

export async function deleteIdea(db: D1Database, id: string, revision: number) {
  const result = await db
    .prepare('DELETE FROM ideas WHERE id=? AND revision=?')
    .bind(id, revision)
    .run();
  if (!result.meta.changes) {
    await getIdea(db, id);
    throw new AdminError(
      409,
      '別の画面で更新されています。最新の内容を確認してから削除してください。',
    );
  }
}
