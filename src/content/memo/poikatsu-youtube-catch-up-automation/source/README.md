# 📺 YouTube ポイ活チャンネル → LINE通知（シンプル版）

特定のYouTubeチャンネルの新着動画をLINEに自動通知。完全無料・外部ライブラリ不要。

## 📱 通知イメージ

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

## 🚀 セットアップ（3ステップ）

### Step 1: APIキーを2つ取得

#### YouTube Data API Key
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成
3. 「APIとサービス」→「ライブラリ」→ **YouTube Data API v3** を有効化
4. 「認証情報」→「認証情報を作成」→「APIキー」
AIzaSyCM9wKm4d_hS1PjXLF4ZaeWoJRxs4UzWYA

#### LINE Messaging API
1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダー作成 → **Messaging API チャネル**を作成
3. 「Messaging API設定」→「チャネルアクセストークン（長期）」を発行
a+RrIcSJKsRcTwYaGDrGsQp5TfQb5W5T3SS95D3Tyuu1ixExlYPsvwyBV8FZJLxONWwn7dYN/dDZ24QaIxzJ2k5+cLj49a775vfVaaSnNX8Pj25mYgRrD5KJ7+C5dZ9czeKcRP5XDvn1LNu/IqnLqQdB04t89/1O/w1cDnyilFU=
4. 「チャネル基本設定」→「あなたのユーザーID」をメモ
U3489da5e68283559c38eb5b17958c0b5
5. 作成したBotを **LINEアプリで友だち追加**（QRコードから）

### Step 2: チャンネルIDを調べる

監視したいYouTubeチャンネルのIDを調べます。

**方法A:** チャンネルページのURLが `https://www.youtube.com/channel/UCxxxxxxxx` → `UCxxxxxxxx` がID

**方法B:** `@ハンドル名` のURLの場合 → [Channel ID Finder](https://commentpicker.com/youtube-channel-id.php) にURLを入力

JSON配列形式でまとめます：
```json
["UCxxxxxxxxxxxxx", "UCyyyyyyyyyyyyy"]
```

UCwO3APcAr15uq0nP7BFOYWw
UCNYpb52GZdr_SVps6Bo1LJA
UCgIUiYo9N8nmubnLNV6DBzA
UCLWx3yr9RuUXNB2MXzFSuYQ
UC4TnL2yRWdT4GXzXaACPATw

### Step 3: GitHubに設定

1. このリポジトリをGitHubにプッシュ

2. **Settings → Secrets and variables → Actions** で以下を登録：

| Secret名 | 値 | 例 |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTubeのAPIキー | `AIzaSy...` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINEアクセストークン | `xK3Oe...` |
| `LINE_USER_ID` | あなたのLINEユーザーID | `U1a2b3...` |
| `CHANNEL_IDS` | チャンネルIDのJSON配列 | `["UCxxx","UCyyy"]` |

3. **Actions タブ** → 「YouTube ポイ活チャンネル通知」→ **Run workflow** でテスト！

## ⚙️ カスタマイズ

### チェック間隔の変更

`.github/workflows/notify.yml` を編集：

```yaml
# 毎時間
- cron: '0 * * * *'

# 6時間おき
- cron: '0 */6 * * *'

# 毎日朝9時 (JST) のみ
- cron: '0 0 * * *'
```

※ `CHECK_HOURS` の値も同じ間隔に合わせてください。

## 💰 コスト

**すべて無料です。**

| 項目 | 無料枠 |
|---|---|
| GitHub Actions | パブリックリポジトリ: 無制限 / プライベート: 月2,000分 |
| YouTube Data API | 日次10,000ユニット（1チャンネル確認 = 約102ユニット） |
| LINE Messaging API | 月200通まで無料 |

## ⚠️ 注意点

- GitHub Actionsのscheduleは数分〜数十分ずれることがあります
- YouTubeチャンネル数が多い場合、APIクォータに注意（約97チャンネル/日が上限目安）
- LINEの無料プランは月200通まで。3時間おき × 毎回通知だと月約240回なので、通知がない回はスキップする設計にしてあります

## 🔧 今後追加したくなったら

- **AI要約を追加**: Claude APIキーを取得して `summarize_with_claude()` を追加
- **他のソース追加**: 楽天キャンペーン、モッピー等のスクレイピング
- **通知をリッチに**: LINE Flex Messageでカード型表示
