---
title: "YouTube新着動画をLINEに自動通知 ― GitHub Actions + Python で完全無料で作る"
date: 2026-02-10
tags: ["Python", "GitHub Actions", "LINE API", "YouTube API", "Automation"]
description: "特定のYouTubeチャンネルの新着動画を自動検知してLINEに通知するシステムを、外部ライブラリなし・完全無料で構築した記録です。"
featured: false
category: "Automation"
draft: true
---

## はじめに

ポイ活系YouTuberの動画には「今日まで」「先着○名」といった期間限定の情報が多い。しかし、チャンネル登録だけではYouTubeの通知が埋もれてしまい、気づいたときにはキャンペーンが終わっていた――という経験が何度かあった。

欲しかったのは「特定のチャンネルに新着があったら、LINEにプッシュ通知してくれる仕組み」だ。調べてみると、YouTube Data API と LINE Messaging API を組み合わせれば、Python の標準ライブラリだけで実現でき、GitHub Actions で定期実行すればサーバー代もかからない。

この記事では、実際に構築して運用しているシステムの全体像・コード・セットアップ手順を紹介する。ポイ活チャンネルの監視から始めて、テック系チャンネルの通知にも横展開した話も含めて書いた。

**完成形のLINE通知：**

<!-- 画像: LINEに届いたポイ活チャンネルの通知スクリーンショット -->

## システム全体像

### 構成

```
┌─────────────────────────┐
│   GitHub Actions        │
│   (cron: 6時間おき)      │
│                         │
│   ┌───────────────┐     │
│   │  main.py      │     │
│   └───┬───────┬───┘     │
└───────┼───────┼─────────┘
        │       │
        ▼       ▼
  ┌──────────┐  ┌──────────────┐
  │ YouTube  │  │ LINE         │
  │ Data API │  │ Messaging API│
  │ v3       │  │              │
  └──────────┘  └──────┬───────┘
                       │
                       ▼
                 ┌──────────┐
                 │ LINEアプリ │
                 │ (通知受信) │
                 └──────────┘
```

### 処理フロー

```
GitHub Actions (notify.yml)
  │
  │  スケジュール: 6時間おき (cron: '0 */6 * * *')
  │  または手動実行 (workflow_dispatch)
  │
  ▼
python main.py 実行
  │
  ├─ 1. 環境変数からAPI キー・チャンネルIDを取得
  │     未設定の変数があればエラー表示して終了
  │
  ├─ 2. チャンネルごとにループ処理
  │     ├─ channels API でチャンネル名を取得（通知表示用）
  │     └─ search API で CHECK_HOURS 以内の新着動画を検索
  │        └─ 公開日時を UTC → JST に変換
  │
  ├─ 3. 新着があればメッセージを組み立てて LINE にプッシュ通知
  │     └─ 5,000文字超の場合は 4,900文字で切り詰め
  │
  └─ 4. 新着なければ通知スキップ（LINE無料枠を節約）
```

### 設計方針

このシステムでは3つの方針を置いた。

**1. 外部ライブラリを使わない**

`urllib.request` / `json` / `datetime` など Python 標準ライブラリのみで構成した。GitHub Actions 上で `pip install` が不要になり、ワークフローがシンプルになる。`requests` を使いたくなるところだが、今回の用途では `urllib.request` で十分だった。

**2. データベースを使わない**

「過去に通知済みかどうか」を記録する方式ではなく、YouTube API の `publishedAfter` パラメータで「直近N時間以内に公開された動画」を取得する方式にした。状態を持たないので、リポジトリにDBファイルやキャッシュを置く必要がない。

**3. 新着がないときは通知しない**

LINE Messaging API の無料枠は月200通。6時間おきに実行すると月約120回になる。毎回通知すると枠を圧迫するが、新着がない回はLINE APIを呼ばない設計にしたことで、実際の通知数はかなり少なく済んでいる。

## 使うもの・コスト

### 使用API

| API | 用途 | 無料枠 |
|-----|------|--------|
| YouTube Data API v3 | チャンネル情報取得・新着動画検索 | 日次10,000ユニット |
| LINE Messaging API | プッシュ通知送信 | 月200通まで |

### コスト：すべて無料

| 項目 | 無料枠 | 備考 |
|---|---|---|
| GitHub Actions | パブリック: 無制限 / プライベート: 月2,000分 | 6時間おき実行で月約120回、1回数秒なので十分余裕あり |
| YouTube Data API | 日次10,000ユニット | 1チャンネルあたり約102ユニット消費 |
| LINE Messaging API | 月200通まで | 新着なし時はスキップするため枠内に収まる |

### YouTube API クォータの計算

1チャンネルの確認で2つのAPIエンドポイントを呼ぶ。

| エンドポイント | 用途 | クォータ消費 |
|---|---|---|
| `channels?part=snippet` | チャンネル名の取得 | 約1ユニット |
| `search?part=snippet` | 新着動画の検索 | 約100ユニット |
| **合計** | | **約102ユニット/チャンネル** |

日次上限10,000ユニット ÷ 102ユニット ≒ **約97チャンネル/日**が上限になる。

たとえば5チャンネルを6時間おき（1日4回）で監視する場合、102 × 5 × 4 = **2,040ユニット/日**で余裕がある。

## セットアップ手順

### Step 1: YouTube Data API キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスし、プロジェクトを作成する

<!-- 画像: Google Cloud Console - プロジェクト作成画面 -->

2. 「APIとサービス」→「ライブラリ」から **YouTube Data API v3** を検索し、有効化する

<!-- 画像: Google Cloud Console - YouTube Data API v3 有効化画面 -->

3. 「認証情報」→「認証情報を作成」→「APIキー」でキーを発行する

<!-- 画像: Google Cloud Console - APIキー発行画面 -->

発行されたキー（`AIzaSy...` の形式）をメモしておく。

### Step 2: LINE Messaging API の設定

1. [LINE Developers](https://developers.line.biz/) にログインし、プロバイダーを作成する

2. プロバイダー内に **Messaging API チャネル**を新規作成する

<!-- 画像: LINE Developers - Messaging API チャネル作成画面 -->

3. 「Messaging API設定」タブを開き、ページ下部の「チャネルアクセストークン（長期）」を発行する

<!-- 画像: LINE Developers - チャネルアクセストークン発行画面 -->

4. 「チャネル基本設定」タブで「あなたのユーザーID」（`U` で始まる文字列）をメモする

<!-- 画像: LINE Developers - ユーザーID確認画面 -->

5. 作成したBotの QR コードを LINE アプリで読み取り、**友だち追加**する。これを忘れると通知が届かない

### Step 3: 監視するYouTubeチャンネルIDを調べる

チャンネルIDの調べ方は2通りある。

**方法A:** チャンネルページのURLが `https://www.youtube.com/channel/UCxxxxxxxx` の形式なら、`UCxxxxxxxx` の部分がそのままチャンネルID。

**方法B:** `https://www.youtube.com/@ハンドル名` の形式の場合は、URLから直接チャンネルIDを読み取れない。[Comment Picker の Channel ID Finder](https://commentpicker.com/youtube-channel-id.php) にURLを貼り付けて取得する。

<!-- 画像: Channel ID Finder でチャンネルIDを取得している画面 -->

今回、ポイ活用として登録したチャンネルの例：

| チャンネル名 | 選んだ理由 |
|---|---|
| ポイ活の達人 | 楽天・PayPay系キャンペーンの速報が早い |
| 節約マスター | モッピー・ハピタスの高還元案件のまとめが充実 |
| お得情報チャンネル | クレジットカード・QR決済のキャンペーン情報を網羅 |
| ポイント投資ラボ | ポイント運用・投資系の新着情報に特化 |
| 家計見直しTV | 固定費削減・ふるさと納税の実践的な情報 |

取得したIDをJSON配列形式でまとめる：

```json
["UCxxxxx", "UCyyyyy", "UCzzzzz", "UCaaaaa", "UCbbbbb"]
```

### Step 4: GitHub リポジトリにデプロイ

リポジトリの構成はこれだけ。

```
poikatsu-automation/
├── .github/
│   └── workflows/
│       └── notify.yml
├── main.py
└── README.md
```

1. リポジトリを GitHub にプッシュする

2. **Settings → Secrets and variables → Actions** で4つの Secret を登録する

<!-- 画像: GitHub Settings - Secrets 登録画面 -->

| Secret名 | 値 | 例 |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTubeのAPIキー | `AIzaSy...` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEアクセストークン | `xK3Oe...` |
| `LINE_USER_ID` | あなたのLINEユーザーID | `U1a2b3...` |
| `CHANNEL_IDS` | チャンネルIDのJSON配列 | `["UCxxx","UCyyy"]` |

3. **Actions タブ** → 「YouTube ポイ活チャンネル通知」→ **Run workflow** で手動テストを実行する

<!-- 画像: GitHub Actions - Run workflow ボタンの画面 -->

成功すると、ログに以下のような出力が表示される。

```
=== YouTube新着チェック開始 ===
対象チャンネル数: 5
チェック期間: 直近 6 時間
📺 ポイ活の達人 を確認中...
   → 新着 1 件
📺 節約マスター を確認中...
   → 新着 0 件
...
✅ LINE通知を送信しました
```

<!-- 画像: GitHub Actions - 実行ログ（成功時）の画面 -->

## コード解説

### main.py

全体は約170行。4つのパートに分かれている。

#### 1. 設定部分

```python
import os
import json
import urllib.request
from datetime import datetime, timedelta, timezone

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_USER_ID = os.environ.get("LINE_USER_ID", "")

CHANNEL_IDS = json.loads(os.environ.get("CHANNEL_IDS", "[]"))
CHECK_HOURS = int(os.environ.get("CHECK_HOURS", "3"))
```

すべての秘密情報を環境変数から取得する。コードにハードコードされた認証情報はない。`CHANNEL_IDS` は `["UCxxx", "UCyyy"]` のようなJSON文字列を `json.loads()` でパースしている。

#### 2. HTTPリクエスト

```python
def api_get(url: str) -> dict:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


def api_post(url: str, data: bytes, headers: dict) -> dict:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))
```

`urllib.request` だけで組んだシンプルなHTTPクライアント。GETはYouTube API、POSTはLINE APIに使う。`requests` ライブラリを使わない分、`pip install` が不要で GitHub Actions のワークフローから依存インストールのステップを省ける。

#### 3. YouTube Data API

```python
def get_channel_name(channel_id: str) -> str:
    url = (
        f"https://www.googleapis.com/youtube/v3/channels"
        f"?part=snippet&id={channel_id}&key={YOUTUBE_API_KEY}"
    )
    data = api_get(url)
    if data.get("items"):
        return data["items"][0]["snippet"]["title"]
    return channel_id
```

`channels` エンドポイントでチャンネル名を取得する。通知メッセージに「どのチャンネルの動画か」を表示するために使う。チャンネルが見つからない場合はIDをそのまま返す。

```python
def get_new_videos(channel_id: str, hours: int) -> list[dict]:
    published_after = (
        datetime.now(timezone.utc) - timedelta(hours=hours)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    url = (
        f"https://www.googleapis.com/youtube/v3/search"
        f"?part=snippet"
        f"&channelId={channel_id}"
        f"&type=video"
        f"&order=date"
        f"&publishedAfter={published_after}"
        f"&maxResults=5"
        f"&key={YOUTUBE_API_KEY}"
    )

    data = api_get(url)
    videos = []
    for item in data.get("items", []):
        utc_time = datetime.strptime(
            item["snippet"]["publishedAt"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=timezone.utc)
        jst_time = utc_time.astimezone(timezone(timedelta(hours=9)))

        videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "channel_title": item["snippet"]["channelTitle"],
            "published_at_jst": jst_time.strftime("%m/%d %H:%M"),
            "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
        })
    return videos
```

`search` エンドポイントで新着動画を検索する。ポイントは `publishedAfter` パラメータで、現在時刻から `CHECK_HOURS` 時間前を ISO 8601 形式で指定している。これにより「直近N時間以内に公開された動画」だけを取得できる。

主なクエリパラメータの意味：

| パラメータ | 値 | 意味 |
|---|---|---|
| `type` | `video` | 動画のみ取得（プレイリスト・チャンネルを除外） |
| `order` | `date` | 公開日時の新しい順 |
| `publishedAfter` | ISO 8601形式 | この日時以降に公開された動画のみ |
| `maxResults` | `5` | 最大5件まで |

取得した公開日時はUTCで返ってくるので、JSTに変換してから `MM/DD HH:MM` 形式に整形する。

```python
# UTC → JST 変換の流れ
"2025-02-07T10:30:00Z"   # YouTube API のレスポンス（UTC）
→ 2025-02-07 10:30 UTC   # datetimeオブジェクトにパース
→ 2025-02-07 19:30 JST   # +9時間
→ "02/07 19:30"           # 表示用に整形
```

#### 4. LINE Messaging API

```python
def send_line_message(message: str):
    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
    }

    if len(message) > 4900:
        message = message[:4900] + "\n...(省略)"

    body = json.dumps({
        "to": LINE_USER_ID,
        "messages": [{"type": "text", "text": message}],
    }).encode("utf-8")

    api_post(url, data=body, headers=headers)
```

LINE のプッシュ通知 API にメッセージを送信する。LINEのテキストメッセージの上限は5,000文字なので、余裕を持って4,900文字で切り詰め、末尾に `...(省略)` を付加する。

`to` にはユーザーIDを指定する。Bot を友だち追加していないユーザーには送信できない。

#### 5. メイン処理

```python
def main():
    # バリデーション
    missing = []
    if not YOUTUBE_API_KEY:
        missing.append("YOUTUBE_API_KEY")
    if not LINE_CHANNEL_ACCESS_TOKEN:
        missing.append("LINE_CHANNEL_ACCESS_TOKEN")
    if not LINE_USER_ID:
        missing.append("LINE_USER_ID")
    if not CHANNEL_IDS:
        missing.append("CHANNEL_IDS")

    if missing:
        print(f"❌ 未設定の環境変数: {', '.join(missing)}")
        return

    all_new_videos = []

    for channel_id in CHANNEL_IDS:
        channel_name = get_channel_name(channel_id)
        videos = get_new_videos(channel_id, CHECK_HOURS)
        all_new_videos.extend(videos)

    if all_new_videos:
        lines = [f"🔔 ポイ活YouTube新着 ({len(all_new_videos)}件)"]
        for video in all_new_videos:
            lines.append("")
            lines.append(f"━━━━━━━━━━━━━━━")
            lines.append(f"📺 {video['channel_title']}")
            lines.append(f"▶️ {video['title']}")
            lines.append(f"🕐 {video['published_at_jst']}")
            lines.append(f"🔗 {video['url']}")
        send_line_message("\n".join(lines))
    else:
        print("✅ 新着なし（通知スキップ）")
```

処理の流れは単純で、

1. 環境変数が揃っているかチェック（未設定があれば即終了）
2. 各チャンネルをループして新着動画を収集
3. 1件でも新着があればメッセージを組み立ててLINE送信。なければスキップ

### GitHub Actions ワークフロー

`.github/workflows/notify.yml` の内容：

```yaml
name: YouTube ポイ活チャンネル通知

on:
  schedule:
    - cron: '0 */6 * * *'  # 6時間おき
  workflow_dispatch:         # 手動実行

jobs:
  check-and-notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: 新着チェック & LINE通知
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
          CHANNEL_IDS: ${{ secrets.CHANNEL_IDS }}
          CHECK_HOURS: "6"
        run: python main.py
```

ポイントをいくつか補足する。

- **cronはUTC基準。** `'0 */6 * * *'` は UTC の 0:00, 6:00, 12:00, 18:00 に実行される。JST では 9:00, 15:00, 21:00, 3:00 になる
- **`workflow_dispatch`** を入れておくと、Actions タブの「Run workflow」ボタンから手動実行できる。セットアップ直後のテストに便利
- **`pip install` ステップがない。** 標準ライブラリだけで動くので、依存インストールが不要
- **`CHECK_HOURS` と cron の間隔を合わせる。** 6時間おきに実行するなら `CHECK_HOURS: "6"` にする。ずれると通知漏れや重複が起きる

## 実際に動かしてみた

### ポイ活チャンネルの通知

ポイ活系の5チャンネルを登録して運用を開始した。

<!-- 画像: GitHub Actions - ポイ活チャンネル通知の実行ログ -->

LINEに届いた実際の通知がこちら。

<!-- 画像: LINEに届いたポイ活チャンネルの通知スクリーンショット -->

チャンネル名・動画タイトル・公開時刻・URLがまとまっているので、LINEを開くだけで新着を一覧できる。URLをタップすれば直接YouTubeアプリで再生が始まる。

### テック系チャンネルへの横展開

ポイ活用がうまく動いたので、同じ仕組みをテック系チャンネルの監視にも横展開した。別リポジトリを作り、`CHANNEL_IDS` に登録するチャンネルを変えるだけで済んだ。

テック系で登録したチャンネルの例：

| チャンネル名 | 選んだ理由 |
|---|---|
| Fireship | 短尺でトレンド技術を解説、新技術のキャッチアップに最適 |
| Theo - t3.gg | Next.js / React 周辺の最新動向に強い |
| ThePrimeagen | パフォーマンスや低レイヤーの話題が豊富 |
| Web Dev Simplified | フロントエンド技術をわかりやすく解説 |
| devaslife | 日本人エンジニアによる開発環境・ツール紹介 |

<!-- 画像: LINEに届いたテック系チャンネルの通知スクリーンショット -->

ポイ活版との違いは以下の通り。

| | ポイ活版 | テック版 |
|---|---|---|
| チャンネル数 | 5 | 5 |
| チェック間隔 | 6時間おき | 6時間おき |
| 通知ヘッダー | `🔔 ポイ活YouTube新着` | `🔔 テック系YouTube新着` |
| リポジトリ | `poikatsu-automation` | 別リポジトリ |

通知ヘッダーの文言を変えるには `main.py` の以下の1行を編集するだけ。

```python
# ポイ活版
lines = [f"🔔 ポイ活YouTube新着 ({len(all_new_videos)}件)"]

# テック版
lines = [f"🔔 テック系YouTube新着 ({len(all_new_videos)}件)"]
```

ジャンルごとにリポジトリを分けることで、`CHANNEL_IDS` やチェック間隔を独立して管理できる。

## ハマったポイント

### ワークフローが GitHub Actions に認識されない

`.github/workflows/notify.yml` をリポジトリの**初回コミット**に含めてプッシュしたところ、Actions タブにワークフローが表示されなかった。GitHub API で確認しても `total_count: 0` が返る。

これは GitHub の既知の挙動で、リポジトリの初回プッシュに含まれたワークフローファイルが自動登録されないことがある。

**対処:** ワークフローファイルにコメントを1行追加するなどの軽微な変更を加えて再プッシュしたところ、GitHub がワークフローを検出・登録した。初回プッシュ後に Actions タブが空の場合は、この方法を試すとよい。

### cron は UTC 基準

GitHub Actions の `schedule` で指定する cron 式は **UTC 基準**で動く。最初これを忘れて `'0 9 * * *'`（毎日9時）と書いたが、実際にはJST 18時に実行されていた。

JSTで考える場合は9時間引く必要がある。たとえば JST 9:00 に実行したければ UTC 0:00、つまり `'0 0 * * *'` と書く。

また、GitHub Actions の cron は**数分〜数十分ずれる**ことがある。正確なタイミングが必要な用途には向かない。

## カスタマイズ

### チェック間隔の変更

`.github/workflows/notify.yml` の cron 式と `CHECK_HOURS` を両方変更する。

```yaml
# 例: 毎時間チェックに変更
on:
  schedule:
    - cron: '0 * * * *'

# ...

        env:
          CHECK_HOURS: "1"
```

```yaml
# 例: 毎日朝9時 (JST) のみ
on:
  schedule:
    - cron: '0 0 * * *'    # UTC 0:00 = JST 9:00

# ...

        env:
          CHECK_HOURS: "24"
```

`CHECK_HOURS` と cron の間隔が一致していないと、通知漏れ（間隔 > CHECK_HOURS）や重複通知（間隔 < CHECK_HOURS）が起きるので注意。

### 監視チャンネルの追加・変更

GitHub の **Settings → Secrets → CHANNEL_IDS** の値を更新するだけ。コードの変更は不要。

```json
["UCxxxxx", "UCyyyyy", "UCzzzzz"]
```

新しいチャンネルのIDを追加すれば、次回の実行から自動的に監視対象に含まれる。

### ジャンル別にリポジトリを分ける

今回はポイ活用とテック用で別リポジトリにした。メリットは以下の通り。

- `CHANNEL_IDS` を独立管理できる
- チェック間隔をジャンルごとに変えられる（ポイ活は頻繁に、テックはゆっくり等）
- 通知ヘッダーの文言を変えることで、LINEに届いたときにどのジャンルかすぐわかる
- 片方の API エラーがもう片方に影響しない

コードは同じ `main.py` をコピーして、通知ヘッダーの1行だけ変えればよい。

## まとめ

YouTube の新着動画を LINE に自動通知するシステムを、Python 標準ライブラリ + GitHub Actions で構築した。外部ライブラリなし・DB なし・サーバー代なしの完全無料で運用できている。

ポイ活チャンネルの監視から始めたが、同じ仕組みをテック系チャンネルにも横展開できた。チャンネルIDを Secret に登録するだけで監視対象を変えられるので、どんなジャンルにも応用がきく。

実際に運用してみて、ポイ活の期間限定キャンペーンの見逃しが明らかに減った。「動画が出たらLINEに来る」というシンプルな仕組みだが、YouTubeアプリの通知に埋もれていた情報が確実に届くようになったのは大きい。

### 今後の拡張案

- **AI要約を追加:** Claude API を組み込んで、動画の内容を自動要約してから通知する。長い動画でも要点だけ把握できるようにしたい
- **通知をリッチに:** LINE Flex Message を使って、サムネイル付きのカード型レイアウトで表示する
- **他のソースを追加:** 楽天キャンペーン、モッピーの高還元案件など、YouTube以外の情報源も同じ仕組みで監視する
