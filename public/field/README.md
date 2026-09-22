# 現地入力PWA

`/field/` で公開するスマホ・タブレット向け樹木点検アプリです。

## 現在の機能

- A：炭素優先 / B：生態系サービス標準
- IndexedDBへの完全オフライン保存
- 1本の樹木に複数写真を保存
- GPS取得
- 枝枯れ率は「約1〜5%」等で表示し、内部値は3, 8, 13…として保存
- Excel点検票へ貼り付けるCSV出力
- JSONバックアップ
- PWA / Service Worker

## 保存先

現時点では入力データと写真は端末内のIndexedDBが正本です。
オンライン復帰時のSupabase自動同期は次段階で実装します。

## URL

GitHub Pages公開後:

- 管理・可視化: `/urban-forest-eco-jp/`
- 現地入力: `/urban-forest-eco-jp/field/`
