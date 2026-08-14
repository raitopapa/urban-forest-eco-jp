# 永続化基盤（MVP 2）

## この段階で確定すること

- 樹木の同一個体情報と、時系列の調査値を分離する。
- 位置はPostGISの `geography(Point, 4326)` で保存する。
- 組織・プロジェクト単位のアクセス制御をRLSで強制する。
- 国内の基本項目は通常列で保持し、案件固有項目は定義表と `jsonb` で拡張する。
- ブラウザにはpublishable keyだけを置き、secret/service role keyは置かない。

## テーブル

| テーブル | 役割 |
|---|---|
| `organizations` | 自治体・会社・チーム |
| `organization_members` | Supabase Authユーザーと組織の所属・役割 |
| `projects` | 公園、街路、調査案件などの管理単位 |
| `trees` | 個体ID、樹種、位置、管理状態など変化の少ない情報 |
| `tree_surveys` | 調査日、DBH、樹高、樹冠、健全度などの履歴 |
| `custom_field_definitions` | 案件ごとの追加項目名、型、単位、選択肢、有効状態 |
| `tree_inventory` | 最新調査を結合し、現在の画面に近い形で読むビュー |

## CSVからの振り分け

| 現在の項目 | 保存先 |
|---|---|
| 管理ID、位置、樹種、i-Tree樹種コード、土地利用、管理状態 | `trees` |
| 調査日、DBH、測定高、樹高、樹冠、健全度、備考 | `tree_surveys` |
| 未定義列 | `custom_field_definitions` と対象行の `custom_values` |

未定義列は初回取込時に「樹木項目」または「調査項目」のどちらかへ割り当てる。項目を削除するときは定義を `is_active = false` にし、過去値は監査・復元のため残す。

## 権限

- 未ログイン利用者にはDBを公開しない。
- 組織メンバーだけが、その組織のプロジェクト・樹木・調査を参照・更新できる。
- 組織の所有者だけがメンバーを追加・変更・削除できる。
- 権限判定はユーザーが変更可能な `user_metadata` に置かず、所属テーブルで判定する。

## 導入順序

1. 専用Supabaseプロジェクトを選択または新規作成する。
2. `database-schema-proposal.sql` を開発DBで検証する。
3. Security/Performance Advisorsを確認する。
4. Supabase CLIで正式なmigrationファイルを生成する。
5. 型定義を生成し、CSV取込をトランザクション化する。
6. ログインとプロジェクト選択を画面へ追加する。

## 今回まだ行わないこと

- 停止中の既存Supabaseプロジェクトへの適用
- 写真Storage、診断、作業管理、i-Tree評価結果の保存
- secret/service role keyのフロントエンド利用

