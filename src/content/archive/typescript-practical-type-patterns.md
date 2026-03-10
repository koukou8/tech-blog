---
title: "TypeScript の型パズルを超えて ― 実務で本当に役立つ型設計のパターン集"
date: 2026-01-03
tags: ["TypeScript", "Patterns"]
description: "チーム開発で「ちょうどいい型安全」を実現するための実践的なパターンをまとめました。"
featured: false
category: "TypeScript"
---

## はじめに

TypeScript の型システムは非常に強力ですが、その力を追求するあまり、チームメンバーが読めないほど複雑な型定義を書いてしまうケースがあります。

本記事では、実務で繰り返し役立った「ちょうどいい型安全」を実現するためのパターンをまとめます。

## Result 型パターン

エラーハンドリングを型で表現する基本パターンです：

```typescript
type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

async function fetchUser(id: string): Promise<Result<User>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return { ok: false, error: new Error(`HTTP ${response.status}`) };
    }
    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// 使用側 — 型の絞り込みで安全にアクセス
const result = await fetchUser('123');
if (result.ok) {
  console.log(result.data.name); // User 型として安全にアクセス
} else {
  console.error(result.error.message); // Error 型として安全にアクセス
}
```

### なぜ例外より Result 型が良いのか

- **型レベルでエラーの存在が明示される** — 呼び出し側がエラーケースを無視できない
- **エラーの型を指定できる** — `Result<User, ValidationError | NetworkError>` のように
- **try-catch のスコープの問題を回避** — 変数のスコープが汚染されない

## Branded Types（タグ付き型）

プリミティブ型に意味を持たせるパターンです：

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;

function createUserId(id: string): UserId {
  return id as UserId;
}

function createPostId(id: string): PostId {
  return id as PostId;
}

function getUser(id: UserId): Promise<User> { /* ... */ }
function getPost(id: PostId): Promise<Post> { /* ... */ }

const userId = createUserId('user-123');
const postId = createPostId('post-456');

getUser(userId);  // OK
getUser(postId);  // コンパイルエラー！型が違う
```

このパターンは、ID の取り違えバグを型レベルで防止できます。

## Discriminated Union で状態を表現

コンポーネントの状態管理に特に有効なパターンです：

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function UserProfile({ userId }: { userId: string }) {
  const [state, setState] = useState<AsyncState<User>>({ status: 'idle' });

  // 各状態に応じた UI をレンダリング
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <Profile user={state.data} />;
    case 'error':
      return <ErrorMessage error={state.error} />;
  }
}
```

## Template Literal Types の実用例

API のエンドポイントを型安全にするパターンです：

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ApiRoutes = {
  'GET /api/users': { response: User[] };
  'GET /api/users/:id': { response: User; params: { id: string } };
  'POST /api/users': { response: User; body: CreateUserInput };
  'PUT /api/users/:id': { response: User; params: { id: string }; body: UpdateUserInput };
  'DELETE /api/users/:id': { response: void; params: { id: string } };
};

async function apiClient<K extends keyof ApiRoutes>(
  route: K,
  ...args: ApiRoutes[K] extends { params: infer P }
    ? [options: { params: P } & (ApiRoutes[K] extends { body: infer B } ? { body: B } : {})]
    : ApiRoutes[K] extends { body: infer B }
    ? [options: { body: B }]
    : []
): Promise<ApiRoutes[K]['response']> {
  // 実装...
}

// 型安全な API コール
const users = await apiClient('GET /api/users');
const user = await apiClient('GET /api/users/:id', { params: { id: '123' } });
```

## 型の複雑さの指標

型定義の複雑さを評価する際の目安です：

1. **チームの新メンバーが5分以内に理解できるか**
2. **型エラーのメッセージが読めるか** — ネストが深いとエラーメッセージが長大に
3. **`as` や `any` を使わずに済むか** — 型アサーションの多用は設計の問題を示唆

> 型は「ドキュメント」の役割も果たします。複雑すぎる型は、ドキュメントとしての価値を失います。

## まとめ

TypeScript の型設計で大切なのは、「できる限り複雑な型を書く」ことではなく、「チームが運用できる範囲で最大限の型安全性を得る」ことです。

本記事で紹介したパターンは、いずれもシンプルで理解しやすく、それでいて実務で繰り返し価値を発揮するものです。チームの TypeScript 力に合わせて、段階的に導入していくことをお勧めします。
