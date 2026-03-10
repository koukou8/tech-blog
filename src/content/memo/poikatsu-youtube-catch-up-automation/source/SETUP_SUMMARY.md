# poikatsu-automation セットアップまとめ

## プロジェクト概要

特定のYouTubeチャンネルの新着動画を定期的にチェックし、LINEに自動通知するシステム。
外部ライブラリ不要（Python標準ライブラリのみ）で完全無料で運用可能。

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
  ├─ 2. YouTube Data API で各チャンネルの新着動画を検索
  │     （CHECK_HOURS 以内に公開された動画が対象）
  ├─ 3. 新着があれば LINE Messaging API でプッシュ通知
  └─ 4. 新着なければ通知スキップ（LINE無料枠を節約）
```

## 使用しているAPI

| API | 用途 | 無料枠 |
|-----|------|--------|
| YouTube Data API v3 | チャンネル情報取得・新着動画検索 | 日次10,000ユニット（約97チャンネル/日） |
| LINE Messaging API | プッシュ通知送信 | 月200通まで |

## GitHub Secrets（必要な環境変数）

| Secret名 | 内容 |
|-----------|------|
| `YOUTUBE_API_KEY` | Google Cloud Console で発行した YouTube Data API キー |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers で発行したチャネルアクセストークン（長期） |
| `LINE_USER_ID` | LINE チャネル基本設定のユーザーID |
| `CHANNEL_IDS` | 監視対象のYouTubeチャンネルIDのJSON配列 (例: `["UCxxx","UCyyy"]`) |

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

- **GitHub Actions:** プライベートリポジトリは月2,000分まで無料（3時間おき実行で月約720回、1回数秒なので十分余裕あり）
- **YouTube Data API:** 1チャンネル確認あたり約102ユニット消費（日次10,000ユニット上限）
- **LINE Messaging API:** 月200通まで無料。新着がない回は通知スキップする設計のため枠内に収まりやすい
- **スケジュール精度:** GitHub Actions の cron は数分〜数十分ずれる場合がある
