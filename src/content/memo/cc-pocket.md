# CC Pocket使ってみた

## CC Pocketとは
参考記事：https://zenn.dev/k9i/articles/20260304_ccpocket

## メリット
- 電車で移動中に開発できる
- プロジェクト横断でclaudecodeのセッションを確認できる

## セットアップ
### 1. TailScaleでMacBookとiPhoneを接続する
#### MacBookにTailScaleをインストール

#### iPhoneにTailScaleをインストール

### 2. iPhoneにCC Pocketをインストール

### 3. Macでブリッジサーバーを起動
```
npx @ccpocket/bridge@latest
```
QRコードが表示される

### 4. CC Pocketからブリッジサーバーに接続
#### 同一のWi-fi環境で接続する場合
QRコードをスキャンでOK
#### 外出先で接続する場合
Add > Hostにコマンド実行時に出力された`Tailscale`の値を入力して接続
例：`ws://100.71.215.98:8765`

### 5. 接続完了

## 実際に利用する
### 1. スマホから操作

### 2. MacBookでも反映を確認

## 使ってみた感想
- 外出先でもClaudeCodeを用いた開発が可能
- 既存セッションだけでなく新規セッションも作成できる
- skillsの呼び出しも可能
- まさにポケット版のClaudeCode