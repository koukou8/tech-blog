---
marp: true
theme: default
paginate: true
size: 16:9
header: ''
footer: 'koki.yoshida'
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

# 技術ブログを書いてみる

<p class="meta">2026.06.27 &nbsp;/&nbsp; Koki Yoshida</p>

---

# Agenda

<div class="card">

1. なぜブログを書いてみようと思ったのか
2. 記事紹介
3. 技術スタックと記事作成の方法
4. 今後やりたいこと

</div>

---

<!-- _class: divider -->
<!-- header: '01. なぜブログを書いてみようと思ったのか' -->

<p class="num">01</p>

# なぜブログを書いてみようと思ったのか

---

## 書いてみようと思ったきっかけ

- 手元で試したこと・トライしたことを残す場所が欲しかった
- あわよくば他の方の役に立てればいいと思った
- 技術ブログを書いているエンジニアへの憧れ

---

## 書くメリット

<div class="columns">

<div>

### 自分向け

- 公開前提で書くことで情報整理を意識できる
- その過程で理解が深まる
- 技術への興味を保つ

</div>

<div>

### 読み手向け

- ハマりポイントがあれば役立てられる
- 情報収集の助け
- 取り組みを知る

</div>

</div>

---

<!-- _class: divider -->
<!-- header: '02. 記事紹介' -->

<p class="num">02</p>

# 記事紹介

---

## 公開記事 ①

<div class="card">

### CC Pocket で iPhone から Claude Code を操作する

CC Pocket は iPhone から Claude Code のセッションを操作できるアプリ。TailScale と組み合わせると、外出先でも Mac で動いている Claude Code を継続利用できる。

</div>

---

## 公開記事 ②

<div class="card">

### 開発環境を Cursor 中心から<br/>ターミナル中心構成に組み直した話

- **Before:** Cursor + Sourcetree で完結していたワークフロー
- **After:** cmux / Neovim / yazi / lazygit / starship
- **狙い:** 複数リポジトリ並行 + Claude Code の並列タスクを快適に

</div>

---

## 公開記事 ③

<div class="card">

### 最近買った・読んでいる技術書 4 冊と、読書環境について

セキュリティ / キャリア / ネットワーク / UI デザインの 4 冊について、選んだ理由と学びを記録。あわせて電子書籍と紙の使い分けにも触れている。

</div>

---

<!-- _class: divider -->
<!-- header: '03. 技術スタックと記事作成の方法' -->

<p class="num">03</p>

# 技術スタックと記事作成の方法

---

## 全体像と tech-blog-article skill

```
Markdown (src/content/blog/*.md)
        │
        ▼
   Astro 5 + Content Collections + Tailwind CSS 4
        │
        ▼
   Cloudflare Pages にデプロイ
```

### tech-blog-article skill

- **入力:** テーマ + メモ、または `src/content/memo/` のファイル
- **出力:** `src/content/blog/` 配下に `draft: true` で記事生成
- **制約:** Content Collections のスキーマ準拠 / 既存記事の文体に揃える

---

## 実際の運用フロー

```
1. 思いついたネタを memo/ に雑に書き溜める
        │
        ▼
2. tech-blog-article skill を呼び出して記事化してもらう
        │
        ▼
3. draft: true で blog/ に生成される
        │
        ▼
4. 自分で読み直して加筆・修正
        │
        ▼
5. draft: false に切り替えて公開
```

---

<!-- _class: divider -->
<!-- header: '04. 今後やりたいこと' -->

<p class="num">04</p>

# 今後やりたいこと

---

## 今後やりたいこと

- 公開前に skill で内容をレビューする
- SEO 対策を入れてみたい
- 技術だと **AWS** について、それ以外だと **資格受験記** 的なものを書いてみたい

---

<!-- header: '' -->

# やってみての気づき

<div class="card">

- メモの丸投げだと **the AI の文章** になるので工夫が必要
- ネットの海に晒されるので、あんまり適当なことは書けなさそう
- でも **自分がやったことが残る** のは嬉しい

</div>

---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Thank you.

<p class="meta">Koki Yoshida &nbsp;/&nbsp; 2026</p>
