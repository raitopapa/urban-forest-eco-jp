# アーキテクチャ方針

## MVP 1

- React + TypeScript + Vite
- MapLibre GL JS
- Papa Parse
- ブラウザ内でCSVを処理し、サーバーへ送信しない
- OpenStreetMap標準タイルは開発確認用。公開運用前に利用規約に適合するタイル提供元へ変更する

## MVP 2

- Supabase Auth
- PostgreSQL + PostGIS
- Supabase Storage（写真）
- Row Level Securityによる組織・プロジェクト単位の権限制御
- 評価エンジンを交換可能にするadapter層

## 境界

アプリは台帳、変換、可視化、履歴、評価結果の出所管理を担当する。i-Treeの科学モデルは再実装せず、CSVまたはAPIを介して利用する。評価値にはモデル、バージョン、地域、通貨、単価年、為替を保存する。
