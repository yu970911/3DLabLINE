# 実接続手順書（LINE × GAS）v1.0

目的: LINE公式アカウントとGASを接続し、Phase1の動作確認まで行う。

---

## 1) 前提準備
- `docs/spreadsheet-headers.md` を使ってスプレッドシートを作成
- `docs/messages-initial.md` のCSVをメッセージ管理に投入
- `docs/richmenu-postback.md` に従いリッチメニューを作成
- GASプロジェクトに `gas/main.gs` を貼り付け

---

## 2) スクリプトプロパティ設定
GASの「プロジェクトの設定」→「スクリプト プロパティ」に追加:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SPREADSHEET_ID`
- `SURVEY_URL`

---

## 3) GAS Webアプリ公開
1. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
2. 実行ユーザー: 自分
3. アクセス: 全員（匿名ユーザー含む）
4. デプロイを実行し、URLを控える

---

## 4) LINE Developer Console 設定
1. Messaging API チャネルを開く
2. Webhook URL にGASのURLを設定
3. Webhook利用設定: ON
4. Webhookの検証を実行（成功を確認）
5. 応答メッセージ/あいさつメッセージ: OFF

---

## 5) 動作確認（最低限）
1. 公式LINEを友だち追加
2. 用途選択のメッセージが届く
3. 「当日参加」を選択
4. 氏名入力依頼が届く
5. 氏名を送信
6. 当日参加URLが届く
7. スプレッドシートに参加履歴が追加される
8. 送信履歴が追加される

---

## 6) トラブルシュート
- Webhook検証失敗: 署名検証またはGAS権限を確認
- 返信が届かない: チャネルアクセストークンを再確認
- スプレッドシート書き込みなし: `SPREADSHEET_ID` とシート名一致を確認

