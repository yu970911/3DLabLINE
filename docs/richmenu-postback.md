# リッチメニュー/Quick Reply Postback設計 v1.0

目的: リッチメニューやQuick Replyの `postback.data` を統一し、GAS側のルーティングと合わせる。

---

## 1) postback data 一覧（推奨）

| ボタン/用途 | data | 備考 |
|---|---|---|
| 当日参加 | action=join_today | 当日参加フロー開始 |
| 事前登録 | action=pre_register | 見込み登録（名前取得） |
| 情報のみ | action=info_only | 見込み登録（名前省略） |
| 案内 | action=guide | 直近案内の簡易返信（Phase1） |
| クーポン | action=coupon | 条件確認の返信（Phase1） |
| アンケート | action=survey | SURVEY_URL を送信 |
| 問い合わせ | action=contact | スタッフ確認の返信 |

---

## 2) リッチメニュー（6ボタン）対応

| ボタン表示 | data | 種別 |
|---|---|---|
| 当日参加 | action=join_today | postback |
| 事前登録 | action=pre_register | postback |
| 案内 | action=guide | postback |
| クーポン | action=coupon | postback |
| アンケート | action=survey | postback |
| 問い合わせ | action=contact | postback |

---

## 3) Quick Reply 例（用途選択）

`MSG-001` のクイック返信に設定:

```text
当日参加:当日参加|事前登録:事前登録|情報のみ:情報のみ
```

※ Quick Reply は message type を使うため、postback ではなく `text` 送信。

---

## 4) 実装対応状況

- `action=join_today/pre_register/info_only/survey/coupon/contact/guide` は `gas/main.gs` に実装済み
- Quick Reply は `メッセージ管理.クイック返信` から構築（message type）

