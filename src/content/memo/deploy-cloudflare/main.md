デプロイ手順

  Step 1: Cloudflare PagesとGitHubを接続

  1. https://dash.cloudflare.com にログイン
  2. 左メニュー「Workers & Pages」→「Create」→「Pages」→「Connect to Git」
  3. GitHubアカウントを連携 → koukou8/baseball-manager を選択
  4. ビルド設定：

  ┌────────────────────────┬────────────────────────────┐
  │          項目          │             値             │
  ├────────────────────────┼────────────────────────────┤
  │ Production branch      │ main                       │
  ├────────────────────────┼────────────────────────────┤
  │ Build command          │ npx @opennextjs/cloudflare │
  ├────────────────────────┼────────────────────────────┤
  │ Build output directory │ .open-next/assets          │
  └────────────────────────┴────────────────────────────┘

  Step 2: 環境変数の設定

  同じ画面で「Environment variables」を展開して以下を追加：

  ┌────────────┬────────────────────────────────────────────────────────────────────────────────────┐
  │   変数名   │                                         値                                         │
  ├────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ DATABASE_U │ postgresql://neondb_owner:npg_VF1PhzpsH7xK@ep-noisy-river-a1xh7mqu-pooler.ap-south │
  │ RL         │ east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require                │
  ├────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ AUTH_SECRE │ gFPJtHCfloe579mmWiszgf3UGMK36kL0OrhW7oaQeEo=                                       │
  │ T          │                                                                                    │
  ├────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ AUTH_URL   │ https://baseball-manager.pages.dev                                                 │
  ├────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ BASIC_AUTH │ 任意（例: admin）                                                                  │
  │ _USER      │                                                                                    │
  ├────────────┼────────────────────────────────────────────────────────────────────────────────────┤
  │ BASIC_AUTH │ 任意のパスワード                                                                   │
  │ _PASSWORD  │                                                                                    │
  └────────────┴────────────────────────────────────────────────────────────────────────────────────┘

  → 「Save and Deploy」をクリック

  Step 3: 動作確認

  - デプロイ完了後、https://baseball-manager.pages.dev（実際のURLはダッシュボードに表示）にアクセス
  - Basic認証ダイアログ → Step 2で設定したユーザー名/パスワードを入力
  - ダッシュボードが表示されれば完了

  Step 4: カスタムドメイン（後からいつでも）

  1. Workers & Pages → baseball-manager → 「Custom domains」
  2. 「Set up a custom domain」→ 取得したドメインを入力