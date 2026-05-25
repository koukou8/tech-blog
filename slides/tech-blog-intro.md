---
marp: true
theme: default
paginate: true
size: 16:9
header: '技術系ブログを始めてみた話'
footer: '© koukou8'
style: |
  :root {
    --green: #1ea64b;
    --green-dark: #0d5e2e;
    --green-deep: #0a3d20;
    --green-light: #e8f5ed;
    --green-soft: #f3faf5;
    --ink: #1a2e22;
    --ink-soft: #4a5b52;
    --ink-muted: #8a9a90;
    --line: #d9e6dd;
    --bg: #ffffff;
  }
  section {
    background: var(--bg);
    color: var(--ink);
    font-family: 'Helvetica Neue', 'Hiragino Sans', 'Yu Gothic', sans-serif;
    font-size: 26px;
    line-height: 1.75;
    padding: 70px 90px;
    letter-spacing: 0.01em;
  }
  h1, h2, h3 {
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 0.005em;
  }
  h1 {
    font-size: 44px;
    color: var(--green-dark);
    margin-bottom: 8px;
    padding-bottom: 0;
  }
  h1::after {
    content: '';
    display: block;
    width: 56px;
    height: 3px;
    background: var(--green);
    margin-top: 14px;
    margin-bottom: 24px;
  }
  h2 {
    font-size: 30px;
    color: var(--ink);
  }
  h3 {
    font-size: 22px;
    color: var(--green-dark);
    font-weight: 700;
  }
  p { color: var(--ink); }
  a {
    color: var(--green-dark);
    text-decoration: none;
    border-bottom: 1px solid var(--green);
    padding-bottom: 1px;
  }
  strong { color: var(--green-dark); font-weight: 700; }
  code {
    background: var(--green-light);
    color: var(--green-dark);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 0.88em;
    font-weight: 500;
  }
  pre {
    background: #f6f8f7;
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    font-size: 0.85em;
    line-height: 1.6;
  }
  pre code { background: transparent; color: var(--ink); padding: 0; }
  blockquote {
    border-left: 3px solid var(--green);
    background: transparent;
    padding: 4px 22px;
    color: var(--ink-soft);
    margin: 18px 0;
    font-style: normal;
  }
  ul, ol { padding-left: 1.3em; }
  li { margin: 0.45em 0; color: var(--ink); }
  ul li::marker { color: var(--green); }
  table {
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 0.9em;
    width: 100%;
  }
  th, td {
    border: none;
    border-bottom: 1px solid var(--line);
    padding: 12px 16px;
    text-align: left;
  }
  th {
    background: var(--green-soft);
    color: var(--green-dark);
    font-weight: 700;
    border-bottom: 2px solid var(--green);
  }
  header {
    color: var(--ink-muted);
    font-size: 13px;
    font-weight: 500;
    padding-top: 22px;
    padding-left: 90px;
    letter-spacing: 0.05em;
  }
  footer {
    color: var(--ink-muted);
    font-size: 13px;
    padding-bottom: 22px;
    padding-left: 90px;
    letter-spacing: 0.05em;
  }
  section::after {
    color: var(--ink-muted);
    font-weight: 500;
    right: 60px;
    bottom: 30px;
  }
  .card {
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 24px 30px;
    margin: 14px 0;
    box-shadow: 0 2px 12px rgba(13, 94, 46, 0.06);
  }
  .accent { color: var(--green-dark); }
  .muted { color: var(--ink-soft); }
  .small { font-size: 0.82em; }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .tag {
    display: inline-block;
    background: var(--green-light);
    color: var(--green-dark);
    font-size: 0.7em;
    font-weight: 700;
    padding: 3px 12px;
    border-radius: 999px;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }
  /* タイトルスライド: gimic のヒーロー風グリーン背景 */
  section.title {
    background: linear-gradient(135deg, #1ea64b 0%, #17923f 100%);
    color: #ffffff;
    padding: 90px 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title h1 {
    color: #ffffff;
    font-size: 60px;
    line-height: 1.35;
  }
  section.title h1::after { background: #ffffff; width: 72px; }
  section.title .lead {
    font-size: 22px;
    color: rgba(255,255,255,0.92);
    margin-top: 24px;
    font-weight: 400;
  }
  section.title .meta {
    margin-top: 80px;
    color: rgba(255,255,255,0.8);
    font-size: 16px;
    letter-spacing: 0.1em;
  }
  /* セクション扉ページ */
  section.divider {
    background: var(--green-soft);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.divider h1 {
    font-size: 52px;
    color: var(--green-dark);
  }
  section.divider .num {
    font-size: 16px;
    color: var(--green);
    font-weight: 700;
    letter-spacing: 0.2em;
    margin-bottom: 18px;
  }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# 技術系ブログを<br/>始めてみた話

<p class="lead">Astro × Claude Code で、書く・運ぶ・続けるを軽くする</p>

<p class="meta">2026.05 &nbsp;/&nbsp; koukou8</p>

---

# Agenda

<div class="card">

1. なぜブログを書いてみようと思ったのか
2. 記事紹介
3. ブログ自体の技術スタックと記事作成の方法
4. 今後書きたい記事

</div>

---

<!-- _class: divider -->

<p class="num">01</p>

# なぜブログを書いてみようと思ったのか

---

## きっかけは「書き残し不足」だった

- 普段の開発で **試したこと・ハマったこと** が手元のメモに散乱
- Slack / Notion / 自作メモアプリ ... どれも **後から検索しづらい**
- AI に「これ前に試したよね？」と聞ける形で残したい

> 公開を前提に書くと、自分のためのメモも一段丁寧になる。

---

## 公開して書くメリット

<div class="columns">

<div>

### 自分向け

- **後から検索できる**外部記憶
- 整理する過程で理解が深まる
- AI に文脈ごと渡せる

</div>

<div>

### 他人向け

- 同じハマり方をした人の時短に
- フィードバックで知識が更新される
- **アウトプット駆動**で学習が加速

</div>

</div>

---

## ハードルは「書く負担」だった

- 凝った CMS は **記事を書くより環境を直す時間** が増えがち
- WYSIWYG より、結局 **Markdown + Git** が一番続く
- 「速く書ける / 速く出せる / 速く直せる」を最優先に組み直すことにした

---

<!-- _class: divider -->

<p class="num">02</p>

# 記事紹介

---

## 公開記事 ①

<div class="card">

<span class="tag">PUBLISHED</span>

### CC Pocket で iPhone から Claude Code を操作する

- **テーマ:** 移動中もスマホから Claude Code セッションを継続
- **要素:** CC Pocket / TailScale / iOS
- **狙い:** MacBook を開かずに「指示出し → 結果確認」を回す

</div>

<p class="muted small">category: Tools</p>

---

## 公開記事 ②

<div class="card">

<span class="tag">PUBLISHED</span>

### 開発環境を Cursor 中心から<br/>ターミナル中心構成に組み直した話

- **Before:** Cursor + Sourcetree で完結していたワークフロー
- **After:** cmux / Neovim / yazi / lazygit / starship
- **狙い:** 複数リポジトリ並行 + Claude Code の並列タスクを快適に

</div>

<p class="muted small">category: Tools / 2026-05-22</p>

---

## 公開記事 ③

<div class="card">

<span class="tag">PUBLISHED</span>

### 最近買った・読んでいる技術書 4 冊と、読書環境について

- **題材:** セキュリティ / キャリア / ネットワーク / UI デザイン
- **狙い:** 「**なぜ選んだか**」「どう動いたか」をセットで残す
- **おまけ:** 電子書籍と紙の使い分けにも触れる

</div>

<p class="muted small">category: Books / 2026-05-25</p>

---

<!-- _class: divider -->

<p class="num">03</p>

# ブログ自体の技術スタックと<br/>記事作成の方法

---

## 全体像

```
Markdown (src/content/blog/*.md)
        │
        ▼
   Astro 5 + Content Collections
        │  (Tailwind CSS 4 でスタイリング)
        ▼
   Cloudflare Pages にデプロイ
```

- **書く側は Markdown だけ** に集中できる構成
- ビルド・配信・キャッシュは全部 Cloudflare 側に寄せる

---

## 採用した技術と理由

| レイヤ | 採用 | 理由 |
|---|---|---|
| フレームワーク | **Astro 5** | MD ファースト / 部分的に Island で十分 |
| スタイル | **Tailwind CSS 4** | デザイントークンを CSS 変数で一元管理 |
| デプロイ | **Cloudflare** | 無料枠 / グローバル配信 / Pages との相性 |
| コンテンツ管理 | **Content Collections** | `frontmatter` を型で検証できる |
| フォント | Nunito / Space Mono | 柔らかさ + コードの読みやすさ |

---

## tech-blog-article スキル

- **入力:** テーマ + 箇条書きメモ、または `src/content/memo/` のメモファイル
- **出力:** `src/content/blog/` 配下の Markdown 記事 (`draft: true`)
- **守る制約:**
  - Astro Content Collections のスキーマに完全準拠
  - 既存記事の **文体・構造** に揃える (丁寧体 + 具体例 + コード)
  - 元の memo ファイルは消さない

---

## 実際の運用フロー

```
1. 思いついたネタを memo/ に雑に書き溜める
        │
        ▼
2. Claude Code に「これを記事化して」と渡す
        │   (tech-blog-article が自動起動)
        ▼
3. draft: true で blog/ に生成される
        │
        ▼
4. 自分で読み直して加筆・修正
        │
        ▼
5. draft: false に切り替えて公開
```

<p class="muted small">「書く」より「ネタを溜める」と「読み直す」に時間を使う構成。</p>

---

## このスタイルの良いところ

- メモ → 記事の **変換コストが下がる**
- スキーマ違反 (frontmatter のミス) でビルドが壊れない
- 文体が **記事間でブレない**
- 何より、**書き始める前のハードルが消える**

> AI に丸投げではなく、「下書きを倍速で作って、自分で仕上げる」が基本姿勢。

---

<!-- _class: divider -->

<p class="num">04</p>

# 今後書きたい記事

---

## ジャンルを広げていきたい

<div class="columns">

<div>

### 技術・開発

- 普段使っているツールの比較
- 自動化スクリプトの設計
- Claude Code / Agent SDK の活用

</div>

<div>

### 学び・キャリア

- **読んだ技術書のまとめ**
- **資格受験記** (AWS / 情報処理 等)
- 日々の小さな知見ログ

</div>

</div>

---

## 直近のネタ候補

- Cloudflare Pages へのデプロイ手順 (memo に下書き済み)
- Claude Code を「自分用ツール」として育てる話
- ポイ活自動化の続編
- 読書ログ: 設計系・LLM 系の書籍
- 資格: 高度試験の勉強プロセスを残す

<p class="muted small">memo/ ディレクトリにすでにいくつか種を蒔いてある状態</p>

---

# まとめ

<div class="card">

- **書く負担を下げる** ことが、続けるための一番の投資だった
- Astro + Cloudflare で **軽量・無料・速い** ブログ基盤に
- Claude Code の **skills** で「メモ → 記事」を半自動化
- これから **技術 / 学び / 資格** までジャンルを広げる

</div>

---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Thank you.

<p class="meta">koukou8 &nbsp;/&nbsp; 2026</p>
