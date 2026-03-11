---
title: "CC PocketでiPhoneからClaudeCodeを操作する"
image: "/images/cc-pocket-icon.png"
date: 2026-03-11
tags: ["Claude Code", "CC Pocket", "iOS", "TailScale", "開発ツール"]
description: "CC PocketはiPhoneからClaudeCodeのセッションを操作できるアプリです。TailScaleと組み合わせることで、外出先でもMacのClaudeCodeを利用できます。"
featured: false
category: "Tools"
draft: false
---

## はじめに

「電車の中でコードレビューや指示出しだけでも済ませられたら」と思ったことはないでしょうか。

CC PocketはiPhoneからClaudeCodeのセッションに接続できるアプリです。MacBookで起動中のClaudeCodeセッションをスマホから継続操作したり、新規セッションを起動したりできます。TailScaleと組み合わせることで、自宅WiFi外の外出先でも安定して利用できます。

参考：[CC Pocketの紹介記事（Zenn）](https://zenn.dev/k9i/articles/20260304_ccpocket)

## CC Pocketのメリット

### 移動中に開発を継続できる

電車やバスでの移動中に、MacBookを開かずにスマホだけで開発を進められます。タスクを投げておいて結果を確認する、次の指示を出すといった使い方が可能です。

### プロジェクト横断でセッションを管理できる

複数プロジェクトのClaudeCodeセッションを一覧で確認できます。

### 隙間時間を有効活用できる

ちょっとした待ち時間や移動中に、長いタスクの進捗確認や次の指示出しができます。MacBookを取り出すほどでもない場面でも活躍します。

### スキル（Skillsコマンド）も呼び出せる

SkillsコマンドもiPhoneから実行できます。ターミナルでの操作と同等の体験がスマホから得られます。

### 新規セッションを作成できる

既存セッションへの接続だけでなく、外出先から新しいClaudeCodeセッションを立ち上げることもできます。アイデアをその場でコードに落とし込む、といった使い方も可能です。

## セットアップ手順

セットアップは大きく4ステップです。

### 1. TailScaleでMacBookとiPhoneを接続する

TailScaleはデバイス間にVPNトンネルを張るツールです。異なるネットワーク環境（外出先のWiFiやモバイル回線）からでも、MacBookに安全に接続できます。

**MacBook側**

[TailScaleの公式サイト](https://tailscale.com/)からmacOS版をインストールし、アカウントにサインインします。

**iPhone側**

App StoreからTailScaleをインストールし、同じアカウントでサインインします。

 [CC Pocket - App Store](https://apps.apple.com/us/app/cc-pocket-dev-agent-remote/id6759188790)

サインイン後、TailScaleの管理画面（または通知センターのTailScaleアイコン）でMacBookのIPアドレス（`100.x.x.x` 形式）を確認しておきます。

### 2. iPhoneにCC Pocketをインストール

App StoreからCC Pocketをインストールします。

### 3. MacBookでブリッジサーバーを起動

MacBookのターミナルで以下を実行します。

```bash
npx @ccpocket/bridge@latest
```

起動するとQRコードが表示されます。このブリッジサーバーがiPhoneとClaudeCodeの橋渡し役を担います。

### 4. CC Pocketからブリッジサーバーへ接続

**同一WiFi環境の場合**

CC PocketでQRコードをスキャンするだけで接続できます。

**外出先（TailScale経由）の場合**

CC Pocketで `Add > Host` を選択し、ブリッジサーバー起動時に出力されたTailscaleのURLを入力します。

```
ws://XXX.XX.XXX.XX:XXXX
```

URLはコマンド実行時のターミナル出力に表示されています。

### 5. 接続完了

CC PocketにClaudeCodeのセッション一覧が表示されれば準備完了です。

![スクリーンショット](/images/cc-pocket-screen.png)

## 実際の使い方

### スマホからタスクを投げる

セッションを選択してメッセージを送るだけで、MacBook上のClaudeCodeが動き始めます。処理が走っている間はスマホを閉まって移動し、落ち着いたタイミングで結果を確認する使い方も可能です。

### MacBook側にも反映される

CC Pocketから送った操作はMacBook上のClaudeCodeにもリアルタイムで反映されます。デスクに戻ったらMacBookでそのまま続きの作業ができます。

## こんなシーンで活躍する

**通勤・移動中**：長めのタスク（テストの実行、ドキュメント生成など）を投げておき、到着までに完了させる。

**カフェやコワーキング**：MacBookを使うほどでもない軽い確認作業や指示出しをスマホで済ませる。

**会議の合間**：ちょっとした空き時間にコードの進捗を確認し、次の方針を指示しておく。

**MacBookを持っていないとき**：外出先でアイデアが浮かんだとき、スマホだけでClaudeCodeを動かしてプロトタイプを試せる。

## 注意点

- ブリッジサーバーはMacBookで起動したままにしておく必要があります。
- 外出先での接続にはTailScaleのインストールと同一アカウントへのサインインが前提です。
- モバイル回線での通信量に注意してください。長時間の操作はWiFi環境での利用を推奨します。

## まとめ

CC Pocketを使うことで、ClaudeCodeを使った開発がMacBookの前だけに限定されなくなります。移動中・隙間時間を活用してタスクを進めたい方にとって、導入コストが低く実用的なツールだと感じています。

TailScaleを一度設定してしまえばあとはQRコードスキャンやURL入力で簡単に繋がります。ClaudeCodeをよく使っている方はぜひ試してみてください。
