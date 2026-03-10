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
