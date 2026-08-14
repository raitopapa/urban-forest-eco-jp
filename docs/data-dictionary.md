# 初期データ項目定義

MVPではブラウザ上の1レコードにまとめる。永続化時に樹木マスタ、調査履歴、診断、作業、評価実行、評価結果へ分離する。

| 分類 | 内部項目 | CSV例 | 型・単位 | MVPでの扱い |
|---|---|---|---|---|
| 識別 | `treeId` | 管理ID | 文字列 | 行内で一意。未指定時は仮ID |
| 位置 | `latitude` / `longitude` | 緯度 / 経度 | WGS84十進度 | 地図表示の必須項目 |
| 樹種 | `speciesOriginal` | 樹種 | 文字列 | 原文を保持 |
| 樹種 | `scientificName` | 学名 | 文字列 | i-Tree照合候補 |
| 樹種 | `iTreeSpeciesCode` | i-Tree樹種コード | 文字列 | 存在すれば出力で優先 |
| 調査 | `surveyDate` | 調査日 | YYYY-MM-DD | MVPでは最新値のみ |
| 寸法 | `dbhCm` | 胸高直径_cm | cm | i-Tree出力の主要項目 |
| 寸法 | `dbhMeasurementHeightM` | 直径測定高_m | m | 測定条件を保持 |
| 寸法 | `totalHeightM` | 樹高_m | m | 任意 |
| 樹冠 | `crownBaseHeightM` | 樹冠下高_m | m | 任意 |
| 樹冠 | `crownWidthNsM` / `crownWidthEwM` | 樹冠幅南北_m / 東西_m | m | 出力時に平均可能 |
| 樹冠 | `crownMissingPct` | 欠損樹冠率_pct | % | 任意 |
| 樹冠 | `crownLightExposure` | 受光面数 | 0–5 | 任意 |
| 健全度 | `healthCondition` | 健全度 | 区分 | good/fair/poor/critical/dead/unknownへ正規化 |
| 管理 | `status` | 管理状態 | 文字列 | activeを既定値 |
| 拡張 | `customFields` | 任意の未定義列 | 文字列辞書 | 列名と値をそのまま保持 |

## 測定上の注意

国内資料では幹周を地上1.2mで測る例がある一方、i-TreeのDBHは約1.37mを基準とする。幹周からDBHへ変換する場合も、元値・測定高・単位・変換方法・実測/推定の別を保存し、元値を上書きしない。
