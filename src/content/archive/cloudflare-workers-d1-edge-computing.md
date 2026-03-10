---
title: "Cloudflare Workers + D1 で実現するエッジコンピューティングの実践"
date: 2026-01-15
tags: ["Cloudflare", "Workers", "Edge"]
description: "Workers と D1 を組み合わせたAPI構築とパフォーマンス計測結果を共有します。"
featured: false
category: "Edge"
---

## はじめに

エッジコンピューティングは、ユーザーに物理的に近いサーバーで処理を行うことで、レイテンシを大幅に削減するアプローチです。Cloudflare Workers は、世界中に分散した300以上のデータセンターでコードを実行できるプラットフォームです。

本記事では、Cloudflare Workers と D1（SQLite ベースのエッジデータベース）を組み合わせた REST API の構築手順と、実際のパフォーマンス計測結果を共有します。

## Workers プロジェクトのセットアップ

まず、Wrangler CLI を使ってプロジェクトを作成します：

```bash
npm create cloudflare@latest my-api -- --type worker-ts
cd my-api
```

### D1 データベースの作成

```bash
npx wrangler d1 create my-database
```

`wrangler.toml` に D1 バインディングを追加します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## API の実装

Workers の `fetch` ハンドラで REST API を構築します：

```typescript
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/posts' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20'
      ).all();

      return Response.json(results);
    }

    if (url.pathname === '/api/posts' && request.method === 'POST') {
      const body = await request.json() as { title: string; content: string };
      const result = await env.DB.prepare(
        'INSERT INTO posts (title, content) VALUES (?, ?)'
      ).bind(body.title, body.content).run();

      return Response.json({ id: result.meta.last_row_id }, { status: 201 });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## スキーマのマイグレーション

D1 ではマイグレーションファイルを使ってスキーマを管理できます：

```sql
-- migrations/0001_create_posts.sql
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_created_at ON posts(created_at);
```

```bash
npx wrangler d1 migrations apply my-database
```

## パフォーマンス計測結果

東京リージョンの従来型サーバー（AWS ap-northeast-1）と比較した結果です：

| メトリクス | 従来型サーバー | Workers + D1 |
|-----------|--------------|-------------|
| Cold Start | 200-400ms | 0-5ms |
| GET /api/posts (東京) | 15-30ms | 5-12ms |
| GET /api/posts (北米) | 180-250ms | 8-15ms |
| GET /api/posts (欧州) | 250-350ms | 6-14ms |

> Workers + D1 の組み合わせでは、ユーザーの地理的位置に関わらず、ほぼ均一なレスポンスタイムを実現できました。

## 注意点とトレードオフ

### D1 の制限事項

- **書き込みはプライマリリージョンを経由** — 読み取りはエッジで高速だが、書き込みにはレイテンシが発生
- **SQLite ベース** — PostgreSQL や MySQL の全機能は使えない
- **データベースサイズの制限** — 無料プランでは 5GB まで

### Workers の制限事項

- **CPU 時間の制限** — 無料プランでは 10ms、有料プランでも 30 秒
- **メモリ制限** — 128MB
- **Node.js API の部分的サポート** — `fs` や `net` モジュールは利用不可

## まとめ

Cloudflare Workers + D1 は、読み取り中心の API やコンテンツ配信に特に適しています。グローバルに展開するサービスで、ユーザーの地理的位置に関わらず高速なレスポンスを提供したい場合に、有力な選択肢となります。

一方で、複雑なトランザクション処理や大量の書き込みが必要なケースでは、従来のデータベースとの組み合わせを検討する必要があります。
