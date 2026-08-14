# 入出力対応表

## 入力

アプリは別名の列を内部項目へ寄せる。未定義列は削除せず追加項目として保持する。

| 入力列の例 | 内部項目 | 変換・検証 | i-Tree候補 |
|---|---|---|---|
| 管理ID / Tree ID / QR_ID | `externalTreeId` | 空の場合は仮ID | Tree ID |
| 樹種 / Species | `speciesOriginal` | 原文保持 | Species（第3優先） |
| 学名 / Scientific Name | `scientificName` | 原文保持 | Species（第2優先） |
| i-Tree樹種コード | `iTreeSpeciesCode` | 将来マスタ照合 | Species（第1優先） |
| 緯度 / Latitude | `latitude` | -90〜90 | 位置情報 |
| 経度 / Longitude | `longitude` | -180〜180 | 位置情報 |
| 胸高直径_cm / DBH | `dbhCm` | 正の数、cm | DBH |
| 樹高_m | `totalHeightM` | 数値、m | Total Tree Height |
| 樹冠下高_m | `crownBaseHeightM` | 数値、m | Crown Base Height |
| 樹冠幅南北_m・東西_m | 2方向の樹冠幅 | 出力時に平均 | Crown Width |
| 健全度 / Tree Condition | `healthCondition` | 共通6区分へ正規化 | Tree Condition |

## 出力

現時点の出力は公式システムへ投入する前の「入力候補」。i-Treeの国・プロジェクト設定とインポート仕様を確認してから利用する。

| 出力列 | 元データ | 欠損時 |
|---|---|---|
| Tree ID | 外部ID、なければ内部ID | 内部IDを使用 |
| Species | i-Treeコード→学名→原樹種名 | レコードを除外 |
| DBH | 胸高直径cm | レコードを除外 |
| Total Tree Height | 樹高 | 空欄 |
| Crown Base Height | 樹冠下高 | 空欄 |
| Crown Width | 南北・東西の平均 | 空欄 |
| Percent Crown Missing | 欠損樹冠率 | 空欄 |
| Crown Light Exposure | 受光面数 | 空欄 |
| Tree Condition | 正規化健全度 | 空欄 |
| Land Use | 周辺土地利用 | 空欄 |
