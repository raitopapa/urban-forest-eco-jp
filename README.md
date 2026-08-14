# Urban Forest Eco JP

都市樹木の台帳、地図表示、データ変換、i-Tree Eco連携を行うオープンな基盤を目指すプロジェクトです。

このリポジトリでは、i-Treeの科学モデル自体は再実装しません。国内の街路樹・公園樹管理項目を保持しながら、i-Treeへ渡すデータと計算結果を追跡・可視化します。

## 現在のMVP

- CSVから樹木台帳を読み込む
- 地図、一覧、個体詳細を表示する
- 日本語・英語の代表的な列名を内部項目へ対応付ける
- 独自列を追加項目として保持する
- i-Tree Eco向け入力候補CSVを出力する

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
- 開発中の非公開プロジェクトであり、ライセンスは未決定です。
