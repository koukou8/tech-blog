# Youtubeで特定のチャンネルの最新動画をLINEで通知する

## プロジェクト概要

特定のYouTubeチャンネルの新着動画を定期的にチェックし、LINEに自動通知するシステム。
外部ライブラリ不要（Python標準ライブラリのみ）で完全無料で運用可能。

## 設計方針

- **外部ライブラリ不使用**: `urllib.request` / `json` / `datetime` など Python 標準ライブラリのみで構成。GitHub Actions 上で `pip install` が不要になり、ワークフローがシンプルになる
- **データベース不使用**: 「過去に通知済みか」を記録せず、`publishedAfter`（公開日時）で新着判定する。状態管理が不要なのでリポジトリにDBファイルやキャッシュを持つ必要がない
- **新着なし時は通知スキップ**: LINE Messaging API の無料枠（月200通）を節約するため、新着動画がない場合は API を呼ばない

## LINE通知イメージ

実際にLINEに届く通知は以下のような形式になる。

```
🔔 ポイ活YouTube新着 (2件)

━━━━━━━━━━━━━━━
📺 ○○ポイ活チャンネル
▶️ 【2月限定】楽天お買い物マラソン完全攻略！
🕐 02/07 19:30
🔗 https://www.youtube.com/watch?v=xxxxx

━━━━━━━━━━━━━━━
📺 △△節約チャンネル
▶️ モッピー高還元案件まとめ
🕐 02/07 18:00
🔗 https://www.youtube.com/watch?v=yyyyy
```

新着がない場合は通知を送信しない（LINE無料枠の節約）。

## リポジトリ構成

```
poikatsu-automation/
├── .github/
│   └── workflows/
│       └── notify.yml      # GitHub Actions ワークフロー定義
├── main.py                  # メイン処理スクリプト
└── README.md                # セットアップ手順・仕様説明
```

## 処理フロー

```
GitHub Actions (notify.yml)
  │
  │  スケジュール: 3時間おき (cron: '0 */3 * * *')
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

## 使用しているAPI

| API | 用途 | 無料枠 |
|-----|------|--------|
| YouTube Data API v3 | チャンネル情報取得・新着動画検索 | 日次10,000ユニット（約97チャンネル/日） |
| LINE Messaging API | プッシュ通知送信 | 月200通まで |

### YouTube Data API クォータ消費の内訳

1チャンネルの確認で2つのエンドポイントを呼ぶ：

| エンドポイント | 用途 | クォータ消費 |
|---|---|---|
| `channels?part=snippet` | チャンネル名の取得 | 約1ユニット |
| `search?part=snippet` | 新着動画の検索 | 約100ユニット |
| **合計** | | **約101〜102ユニット/チャンネル** |

日次上限10,000ユニット ÷ 102ユニット ≒ **約97チャンネル/日**が上限。
3時間おき（1日8回）で5チャンネルを監視する場合：102 × 5 × 8 = 4,080ユニット/日で余裕あり。

## GitHub Secrets（必要な環境変数）

| Secret名 | 内容 |
|-----------|------|
| `YOUTUBE_API_KEY` | Google Cloud Console で発行した YouTube Data API キー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers で発行したチャネルアクセストークン（長期） |
| `LINE_USER_ID` | LINE チャネル基本設定のユーザーID |
| `CHANNEL_IDS` | 監視対象のYouTubeチャンネルIDのJSON配列 (例: `["UCxxx","UCyyy"]`) |

## セットアップ手順

### Step 1: APIキーを取得

#### YouTube Data API Key

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成
3. 「APIとサービス」→「ライブラリ」→ **YouTube Data API v3** を有効化
4. 「認証情報」→「認証情報を作成」→「APIキー」で発行

#### LINE Messaging API

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダー作成 → **Messaging API チャネル**を作成
3. 「Messaging API設定」→「チャネルアクセストークン（長期）」を発行
4. 「チャネル基本設定」→「あなたのユーザーID」をメモ
5. 作成したBotを **LINEアプリで友だち追加**（QRコードから）

### Step 2: チャンネルIDを調べる

監視したいYouTubeチャンネルのIDを調べる。

**方法A:** チャンネルページのURLが `https://www.youtube.com/channel/UCxxxxxxxx` の場合、`UCxxxxxxxx` がID

**方法B:** `@ハンドル名` のURLの場合、[Channel ID Finder](https://commentpicker.com/youtube-channel-id.php) にURLを入力して取得

取得したIDをJSON配列形式でまとめる：

```json
["UCxxxxxxxxxxxxx", "UCyyyyyyyyyyyyy"]
```

### Step 3: GitHubに設定

1. リポジトリをGitHubにプッシュ
2. **Settings → Secrets and variables → Actions** で以下を登録：

| Secret名 | 値 | 例 |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTubeのAPIキー | `AIzaSy...` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEアクセストークン | `xK3Oe...` |
| `LINE_USER_ID` | あなたのLINEユーザーID | `U1a2b3...` |
| `CHANNEL_IDS` | チャンネルIDのJSON配列 | `["UCxxx","UCyyy"]` |

3. **Actions タブ** → 「YouTube ポイ活チャンネル通知」→ **Run workflow** でテスト実行

## 実際のコード

### main.py 全体

```python
"""
YouTube新着動画 → LINE通知（シンプル版）
========================================
特定のYouTubeチャンネルの新着動画を検出し、
LINEに通知します。AI要約なし・完全無料。
"""

import os
import json
import urllib.request
from datetime import datetime, timedelta, timezone

# ============================================================
# 設定（すべてGitHub Secretsから取得）
# ============================================================
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")
LINE_USER_ID = os.environ.get("LINE_USER_ID", "")

# 監視するYouTubeチャンネルID（JSON配列）
# 例: ["UCxxxxx", "UCyyyyy"]
CHANNEL_IDS = json.loads(os.environ.get("CHANNEL_IDS", "[]"))

# 何時間前までの動画を新着とみなすか
CHECK_HOURS = int(os.environ.get("CHECK_HOURS", "3"))


# ============================================================
# HTTPリクエスト
# ============================================================
def api_get(url: str) -> dict:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


def api_post(url: str, data: bytes, headers: dict) -> dict:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


# ============================================================
# YouTube Data API
# ============================================================
def get_channel_name(channel_id: str) -> str:
    url = (
        f"https://www.googleapis.com/youtube/v3/channels"
        f"?part=snippet&id={channel_id}&key={YOUTUBE_API_KEY}"
    )
    data = api_get(url)
    if data.get("items"):
        return data["items"][0]["snippet"]["title"]
    return channel_id


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
        # 公開日時をJSTに変換
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


# ============================================================
# LINE Messaging API
# ============================================================
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
    print("✅ LINE通知を送信しました")


# ============================================================
# メイン処理
# ============================================================
def main():
    print("=== YouTube新着チェック開始 ===")
    print(f"対象チャンネル数: {len(CHANNEL_IDS)}")
    print(f"チェック期間: 直近 {CHECK_HOURS} 時間")

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
        print(f"📺 {channel_name} を確認中...")

        videos = get_new_videos(channel_id, CHECK_HOURS)
        print(f"   → 新着 {len(videos)} 件")
        all_new_videos.extend(videos)

    # 通知
    if all_new_videos:
        lines = [f"🔔 ポイ活YouTube新着 ({len(all_new_videos)}件)"]

        for video in all_new_videos:
            lines.append("")
            lines.append(f"━━━━━━━━━━━━━━━")
            lines.append(f"📺 {video['channel_title']}")
            lines.append(f"▶️ {video['title']}")
            lines.append(f"🕐 {video['published_at_jst']}")
            lines.append(f"🔗 {video['url']}")

        message = "\n".join(lines)
        print(f"\n--- 送信内容 ---\n{message}\n----------------")
        send_line_message(message)
    else:
        print("✅ 新着なし（通知スキップ）")


if __name__ == "__main__":
    main()
```

### コード解説

#### 設定部分

すべての設定値を環境変数（GitHub Secrets）から取得する。ハードコードされた秘密情報はない。

- `YOUTUBE_API_KEY` / `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`: 各APIの認証情報
- `CHANNEL_IDS`: 監視対象チャンネルのJSON配列。`json.loads()` でパース
- `CHECK_HOURS`: 何時間前までを「新着」とみなすか（デフォルト3時間）

#### HTTPリクエスト (`api_get` / `api_post`)

`urllib.request` のみを使ったシンプルなHTTPクライアント。外部ライブラリ（`requests` 等）を使わないため、GitHub Actions 上で `pip install` が不要。

- `api_get`: YouTube Data API からのデータ取得に使用
- `api_post`: LINE Messaging API へのメッセージ送信に使用

#### YouTube Data API 関連

**`get_channel_name(channel_id)`**

`channels` エンドポイント（`part=snippet`）でチャンネル名を取得。通知メッセージにチャンネル名を表示するために使用。チャンネルが見つからない場合は channel_id をそのまま返す。

APIレスポンス例：

```json
{
  "items": [
    {
      "snippet": {
        "title": "○○ポイ活チャンネル"
      }
    }
  ]
}
```

**`get_new_videos(channel_id, hours)`**

`search` エンドポイントで `publishedAfter` パラメータにより指定時間内の新着動画を検索。主なクエリパラメータ：

| パラメータ | 値 | 意味 |
|---|---|---|
| `type` | `video` | 動画のみ（プレイリスト・チャンネルを除外） |
| `order` | `date` | 公開日時の新しい順 |
| `publishedAfter` | ISO 8601形式 | この日時以降に公開された動画のみ |
| `maxResults` | `5` | 最大5件まで取得 |

取得したUTC時刻をJST（+9時間）に変換して `MM/DD HH:MM` 形式で整形する：

```python
# UTC → JST 変換の流れ
utc_time = datetime.strptime("2025-02-07T10:30:00Z", "%Y-%m-%dT%H:%M:%SZ")
# → 2025-02-07 10:30 UTC
jst_time = utc_time.astimezone(timezone(timedelta(hours=9)))
# → 2025-02-07 19:30 JST
jst_time.strftime("%m/%d %H:%M")
# → "02/07 19:30"
```

#### LINE Messaging API 関連

**`send_line_message(message)`**

`/v2/bot/message/push` エンドポイントにPOSTリクエストを送信。

- `Authorization` ヘッダーに `Bearer {トークン}` を設定
- LINEのメッセージ上限は5,000文字。余裕を持って **4,900文字で切り詰め**、`\n...(省略)` を付加
- `to` にはユーザーIDを指定（Botを友だち追加していないと送信エラーになる）

#### メイン処理 (`main`)

1. **バリデーション**: 必須の環境変数が未設定ならエラーメッセージを出して早期リターン
2. **チャンネルループ**: 各チャンネルについて `get_channel_name` → `get_new_videos` を実行し、結果を `all_new_videos` に集約
3. **通知判定**: 新着動画があればメッセージを組み立ててLINE通知。なければ `✅ 新着なし` を出力してスキップ（LINE APIは呼ばない）

## GitHub Actions ワークフロー

`.github/workflows/notify.yml` の想定内容：

```yaml
name: YouTube ポイ活チャンネル通知

on:
  schedule:
    - cron: '0 */3 * * *'    # 3時間おき（UTC基準）
  workflow_dispatch:          # 手動実行ボタン

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Run notification script
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
          CHANNEL_IDS: ${{ secrets.CHANNEL_IDS }}
          CHECK_HOURS: "3"
        run: python main.py
```

**ポイント:**
- `cron: '0 */3 * * *'` は UTC 基準。JST とは9時間のずれがある
- `workflow_dispatch` を設定しておくと、Actions タブから手動実行できる（テスト時に便利）
- 環境変数は `secrets` から注入。コード中に秘密情報をハードコードしない
- `pip install` ステップがない（標準ライブラリのみなので不要）

## カスタマイズ

### チェック間隔の変更

`.github/workflows/notify.yml` の cron 式を編集する。

```yaml
# 毎時間
- cron: '0 * * * *'

# 6時間おき
- cron: '0 */6 * * *'

# 毎日朝9時 (JST) のみ
- cron: '0 0 * * *'
```

`CHECK_HOURS` の値も同じ間隔に合わせること。たとえば6時間おきなら `CHECK_HOURS: "6"` に設定する。

### 監視チャンネルの追加・変更

GitHub の **Settings → Secrets → CHANNEL_IDS** の値を更新するだけ。コードの変更は不要。

```json
["UCxxxxx", "UCyyyyy", "UCzzzzz"]
```

## セットアップ時に発生した問題と対処

### ワークフローが GitHub Actions に認識されない

**症状:** `.github/workflows/notify.yml` をリポジトリの初回コミットに含めてプッシュしたが、Actions タブに表示されなかった（`workflows` API が `total_count: 0` を返す）。

**原因:** GitHub の既知の挙動で、リポジトリの初回プッシュ（initial commit）に含まれたワークフローファイルが自動登録されないことがある。

**対処:** ワークフローファイルに軽微な変更を加えて再プッシュすることで、GitHub がワークフローを検出・登録した。

## 現在の状態

- ワークフローは正常に登録・実行済み
- **`CHECK_HOURS` は一時的に `24` に設定中**（テスト用）。本番運用時は `3` に戻すこと

### CHECK_HOURS を戻す手順

`.github/workflows/notify.yml` の以下の行を変更:

```yaml
# 現在（テスト用）
CHECK_HOURS: "24"

# 本番用に戻す
CHECK_HOURS: "3"
```

## コスト・制約

**すべて無料で運用可能。**

| 項目 | 無料枠 | 備考 |
|---|---|---|
| GitHub Actions | パブリック: 無制限 / プライベート: 月2,000分 | 3時間おき実行で月約720回、1回数秒なので十分余裕あり |
| YouTube Data API | 日次10,000ユニット | 1チャンネル確認あたり約102ユニット消費（約97チャンネル/日が上限） |
| LINE Messaging API | 月200通まで無料 | 新着がない回は通知スキップする設計のため枠内に収まりやすい |

## 注意点

- **GitHub Actions の cron 精度:** 数分〜数十分ずれる場合がある。正確なタイミングが必要な用途には向かない
- **YouTube API クォータ:** チャンネル数が多い場合は上限に注意。約97チャンネル/日が目安
- **LINE 無料枠:** 月200通まで。3時間おき × 毎回通知だと月約240回になるが、新着がない回はスキップする設計なので枠内に収まりやすい
- **Bot の友だち追加:** LINE Bot を自分のLINEアカウントで友だち追加していないと通知が届かない

## 今後の拡張案

- **AI要約を追加**: Claude API キーを取得して `summarize_with_claude()` を追加し、動画の内容を自動要約
- **他のソース追加**: 楽天キャンペーン、モッピー等のスクレイピング
- **通知をリッチに**: LINE Flex Message でカード型表示
