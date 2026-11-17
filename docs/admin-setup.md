# 記事アイデア管理画面

公開ブログと同じ `tech-blog` Worker の `/admin/` に配置します。
一覧・編集APIは `/admin/api/ideas` です。記事の公開やGitHub操作は行いません。
本文メモはプレーンテキストです。

## ローカルで確認

Node.js 22以上と、それに付属するnpmを使います。

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev:db
npm run dev -- --host 127.0.0.1
```

表示されたローカルURLの `/admin/` を開きます。
ローカルD1は `.wrangler/state/` に保存します。本番DBには接続しません。
`.dev.vars` の `ADMIN_DEV_AUTH=true` は開発ビルドかつループバック接続でのみ有効です。
本番ビルドでは、同じフラグを設定しても認証を省略できません。
ローカルのログアウトリンクにはCloudflare Accessの機能はありません。

## 本番の準備

以下は初回に行う設定です。新しいWorkerは不要です。
本番DBを作成したりマイグレーションを適用したりする前に、対象アカウントを確認してください。

### 1. D1を作成

Cloudflareの `Storage & databases → D1` で `tech-blog-ideas` を作成し、Database IDを控えます。
CLIなら `npx wrangler d1 create tech-blog-ideas` でも作成できます。
デプロイ用APIトークンはWorkerデプロイ権限に加えて、対象アカウントのD1をバインドできる権限が必要です。
DB作成・リモートマイグレーション用の認証にはD1の編集権限が必要です。

### 2. Cloudflare Accessを設定

Zero Trustの `Access → Applications → Add an application → Self-hosted` を選びます。

- Application name: `tech-blog-admin`
- Public hostname: 実際のブログのホスト名
- Path: `/admin` とその配下すべて。`/admin/` と `/admin/api/ideas` が保護されることを確認
- Allowポリシー: `Emails` で自分のメールアドレス1件だけを指定
- ログイン方法: 利用するIdP、またはメールのOne-time PIN
- BypassやEveryoneのポリシーは追加しない

同じWorkerに複数の本番ホスト名がある場合は、それぞれの `/admin` を同じアプリケーションで保護します。
**Worker全体へのAccess有効化はしないでください。公開ブログまでログイン必須になります。**
パス単位のSelf-hosted applicationを使います。GitHub PagesのURLは対象にしません。

AccessのチームURL（`https://チーム名.cloudflareaccess.com`）と、作成したアプリのApplication Audience（AUD）を控えます。
Worker側でもJWTの署名・issuer・audience・有効期限・メールアドレスを検証します。
別ホスト名からのアクセスでも、正しいJWTがなければアイデアは取得できません。

### 3. GitHubのVariablesを登録

`Settings → Environments → production → Environment variables` に追加します。
APIトークンは既存のSecretのままです。以下はトークンではない設定値なのでVariablesに登録します。

| 名前 | 値 |
| --- | --- |
| `IDEAS_DB_ID` | 作成したD1のDatabase ID |
| `ADMIN_ACCESS_ISSUER` | `https://チーム名.cloudflareaccess.com`。末尾の `/` なし |
| `ADMIN_ACCESS_AUD` | AccessアプリのAUD、64桁の16進文字列 |
| `ADMIN_OWNER_EMAIL` | Allowポリシーと同じ自分のメールアドレス |

4つすべて空なら、ブログのみデプロイ可能で管理画面は503になります。
一部のみの入力や不正な形式の場合は、設定の取り違えを防ぐためデプロイ前に停止します。
Workerのダッシュボードだけで設定するのではなく、これらのVariablesを正として管理します。
生成される `wrangler.deploy.jsonc` はコミットしません。

### 4. 本番DBのテーブルを作成

上の4値をローカルの環境変数にも設定してから実行します。
認証情報をファイルやチャットに貼り付ける必要はありません。

```bash
npm run deploy:config
npx wrangler d1 migrations apply IDEAS_DB --remote --config wrangler.deploy.jsonc
```

対象が `tech-blog-ideas` のDatabase IDであることを確認してから適用します。
初期マイグレーションはテーブルとインデックスの追加だけで、サンプルデータは投入しません。
後続マイグレーションでも本番適用は明示的に行います。Actionsから自動適用はしません。

### 5. レビュー後にリリース

既存の `作業ブランチ → staging → main` のPRフローで進めます。
GitHub Pagesは静的ブログのみです。管理画面や保存データはPagesに含めません。
管理画面の検収はローカルで行い、mainマージ後に実際のAccessログインを確認します。
mainへのマージで既存のDeploy Productionが同じWorkerにデプロイします。
この変更だけで自動マージ・本番公開は行いません。

## リリース時の確認

1. 未ログインのシークレットウィンドウで `/` と記事はログインなしで読める。
2. `/admin/` と `/admin/api/ideas` はAccessログインが必要。
3. 許可したメールアドレスだけがログインできる。
4. 作成・保存後、再読み込みしてもデータが残る。別端末でも確認する。
5. 検索・ステータス・タグの絞り込みが動作する。
6. 削除確認をキャンセルすると残り、確定すると削除される。
7. 同じアイデアを2タブで開き、片方を保存後にもう片方を保存すると409で上書きされない。
8. 別ホスト名がある場合、JWTのない直接APIアクセスではデータを返さない。
9. 管理画面/APIのレスポンスに `Cache-Control: private, no-store` がある。キャッシュの強制ルールは設定しない。

## 検査コマンド

```bash
npm test
npm run check:admin
npm run build:staging
npm run check:build -- --target staging --base /tech-blog
npm run build
npm run check:build -- --target production
```

全体の `npm run check` は既存 `src/components/Header.astro` の閉じタグがコメント内にあるため失敗します。
管理画面の型検査は別の `check:admin` で実施します。公開側の既存ファイルはこの機能で変更しません。

依存関係の監査では、既存Astro 5とその周辺依存にHigh/Criticalの警告が残っています。
この変更では公開ブログ全体に影響するメジャーアップデートは実施しません。
管理画面を本番で有効化する前に、別途更新と回帰検証を行ってください。
新しく管理画面で直接使うZodは修正済みの4系を使います。

参考: [Cloudflare AccessのWorker・ホスト名・パス保護](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)、[D1マイグレーション](https://developers.cloudflare.com/d1/reference/migrations/)。
