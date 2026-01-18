# GAS 実装方針（骨子）v1.0

目的: Phase1 を実装するためのGAS構成と主要関数の骨子を定義する。

---

## 1) 構成案（1ファイルでも可）

### 1.1 推奨ファイル分割（任意）
- `main.gs` : エントリーポイント（doPost、doGet、トリガー）
- `line.gs` : LINE API 送受信、署名検証
- `sheets.gs` : スプレッドシートI/O
- `router.gs` : 状態遷移・ルーティング
- `templates.gs` : メッセージ生成（差し込み）

※Phase1は `main.gs` 1ファイルでも実装可能

---

## 2) スクリプトプロパティ
- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `SURVEY_URL`
- `SPREADSHEET_ID`

---

## 3) 主要関数（骨子）

### 3.1 エントリーポイント
- `doPost(e)`
  - 署名検証
  - JSON解析
  - イベント配列を走査
  - `handleEvent(event)` に委譲

### 3.2 イベントルーティング
- `handleEvent(event)`
  - `event.type` で分岐
    - `follow` → `handleFollow(event)`
    - `unfollow` → `handleUnfollow(event)`
    - `message` → `handleMessage(event)`
    - `postback` → `handlePostback(event)`

### 3.3 状態取得/更新
- `getFriend(userId)`
- `upsertFriend(friend)`
- `updateFriendStatus(userId, status)`

### 3.4 返信/送信
- `replyMessage(replyToken, messages)`
- `pushMessage(userId, messages)`
- `logSendHistory(payload)`

### 3.5 当日参加処理
- `handleJoinToday(userId, fullName)`
  - 最新有効WS取得
  - 参加者一覧へ保存
  - 当日案内メッセージ返信

### 3.6 メッセージ生成
- `buildMessageById(messageId, vars)`
  - メッセージ管理シートから本文取得
  - 差し込み変数を置換

---

## 4) シートI/O（想定API）

### 4.1 友だち一覧
- `findFriendRow(userId)`
- `createFriendRow(userId, displayName)`
- `updateFriendRow(rowIndex, updates)`

### 4.2 開催管理
- `getNearestActiveWorkshop()`

### 4.3 参加履歴
- `appendParticipant(record)`
- `existsParticipant(userId, workshopId)`

### 4.4 メッセージ管理
- `getMessageTemplate(messageId)`

### 4.5 送信履歴
- `appendSendLog(record)`

---

## 5) エラーハンドリング
- try/catch でイベント単位に保護
- 失敗時も他イベントを処理
- 例外は Stackdriver Logs に記録

---

## 6) Phase1 実装優先順位
1. 署名検証 + doPost 受信
2. 友だち追加 → 用途選択送信
3. テキスト受信 → 状態遷移
4. 当日参加フロー（氏名取得 → URL送信）
5. 送信履歴記録

---

## 7) 想定ユーティリティ
- `now()` : 現在時刻を `yyyy-MM-dd HH:mm:ss` で返す
- `normalizeText(text)` : 余分な空白/全角半角を簡易正規化
