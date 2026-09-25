# Urban Forest Eco JP

都市樹木の台帳、地図表示、データ変換、i-Tree Eco連携を行うオープンな基盤を目指すプロジェクトです。

このリポジトリでは、i-Treeの科学モデル自体は再実装しません。国内の街路樹・公園樹管理項目を保持しながら、i-Treeへ渡すデータと計算結果を追跡・可視化します。

## 現在のMVP

- CSVから樹木台帳を読み込む
- 地図、一覧、個体詳細を表示する
- 日本語・英語の代表的な列名を内部項目へ対応付ける
- 独自列を追加項目として保持する
- i-Tree Eco向け入力候補CSVを出力する

## Webアプリ

- [管理・可視化画面](https://raitopapa.github.io/urban-forest-eco-jp/)
- [現地入力PWA（全木点検）](https://raitopapa.github.io/urban-forest-eco-jp/field/)
- 現地入力はIndexedDBへ保存し、オフラインでも利用可能
- 登録済み利用者は現地入力画面の「書き出し」から、写真本体を除く点検記録を共有DBに手動送信できます。写真No.とファイル名を紐付けます。詳しくは[現地入力PWAの手順](public/field/README.md)を参照してください。
- 自動同期は次段階で実装予定

## 起動

```bash
npm install
npm run dev
```

## 確認

```bash
npm test
npm run build
```

## ドキュメント

- [MVPスコープ](docs/mvp-scope.md)
- [初期データ項目定義](docs/data-dictionary.md)
- [入出力対応表](docs/io-crosswalk.md)
- [アーキテクチャ方針](docs/architecture.md)

## 注意

- サンプルデータは架空のデモデータです。
- i-Tree用CSVは項目変換の初期案です。実際の投入前に、対象プロジェクトのi-Treeインポート仕様を確認してください。
- 開発中のプロジェクトであり、ライセンスは未決定です。
