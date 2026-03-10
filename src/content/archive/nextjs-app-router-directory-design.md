---
title: "Next.js App Router で考える大規模アプリケーションのディレクトリ設計"
date: 2026-01-28
tags: ["Next.js", "React", "Architecture"]
description: "App Router の登場により、Next.js のプロジェクト構造は大きく変わりました。Feature-Sliced Design を参考に、実務で採用した設計パターンとその判断基準を整理します。"
featured: true
category: "Architecture"
---

## はじめに

Next.js 13 で導入された App Router は、React Server Components をファーストクラスでサポートし、これまでの Pages Router とは根本的に異なるアーキテクチャを提供します。

この変化に伴い、プロジェクトのディレクトリ構造についても再考が必要になりました。本記事では、実務で10人規模のチームで採用したディレクトリ設計パターンについて共有します。

## 従来の Pages Router での課題

Pages Router 時代のよくある構成は以下のようなものでした：

```
src/
├── pages/
│   ├── index.tsx
│   ├── about.tsx
│   └── dashboard/
│       ├── index.tsx
│       └── settings.tsx
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── DashboardChart.tsx
│   └── SettingsForm.tsx
└── lib/
    ├── api.ts
    └── utils.ts
```

この構成の問題点は明確です：

- **components ディレクトリの肥大化** — 全コンポーネントがフラットに並ぶ
- **関連するファイルが散在** — ダッシュボードのページ、コンポーネント、ロジックが別々のディレクトリに
- **依存関係が不明瞭** — どのコンポーネントがどのページ専用なのか分からない

## Feature-Sliced Design の考え方

Feature-Sliced Design（FSD）は、フロントエンドアプリケーションのためのアーキテクチャ手法です。レイヤーとスライスという概念で、コードの責務を明確に分離します。

```
src/
├── app/          # アプリケーション初期化、プロバイダー
├── features/     # ビジネスロジックを含む機能単位
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   └── dashboard/
│       ├── components/
│       ├── hooks/
│       └── api/
├── entities/     # ビジネスエンティティ
├── shared/       # 共有ユーティリティ、UI コンポーネント
│   ├── ui/
│   ├── lib/
│   └── api/
└── widgets/      # 複数 feature を組み合わせたブロック
```

## App Router での実践的な構成

FSD の考え方を App Router に適用した結果、以下の構成に落ち着きました：

```typescript
// src/features/auth/components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const { login, isLoading } = useAuth();

  return (
    <form onSubmit={(e) => { e.preventDefault(); login(email); }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button loading={isLoading}>ログイン</Button>
    </form>
  );
}
```

### ポイント

1. **`app/` ディレクトリはルーティングのみに集中** — ビジネスロジックは features に分離
2. **Server Component と Client Component の境界を明確に** — `'use client'` の位置を意識的に決定
3. **共有コンポーネントは `shared/ui/`** — デザインシステムのコンポーネントをここに集約

## Server Component と Client Component の分離戦略

App Router では、デフォルトで全コンポーネントが Server Component です。`'use client'` ディレクティブを最小限のスコープで適用することが重要です。

```typescript
// Bad: ページ全体を Client Component にしてしまう
'use client';
export default function DashboardPage() { /* ... */ }

// Good: インタラクティブな部分だけを Client Component に分離
// app/dashboard/page.tsx (Server Component)
import { DashboardChart } from '@/features/dashboard/components/DashboardChart';
import { getStats } from '@/features/dashboard/api/getStats';

export default async function DashboardPage() {
  const stats = await getStats(); // サーバーサイドでデータ取得
  return <DashboardChart initialData={stats} />;
}
```

## まとめ

App Router のディレクトリ設計で重要なのは以下の3点です：

1. **ルーティングとビジネスロジックの分離** — `app/` はルーティング層、ロジックは `features/` へ
2. **Client Component の最小化** — Server Component をデフォルトとし、必要な部分だけクライアントに
3. **チームの合意** — どんな設計パターンも、チーム全員が理解し運用できることが最も重要

完璧な設計パターンは存在しません。プロジェクトの規模やチームのスキルセットに応じて、適切な粒度を見つけていくことが大切です。
