import type { TreeRecord } from "../domain/tree";

const LABELS: Record<TreeRecord["healthCondition"], string> = { good: "良好", fair: "普通", poor: "不良", critical: "危険", dead: "枯死", unknown: "未評価" };

export function TreeDetails({ tree }: { tree?: TreeRecord }) {
  if (!tree) return <aside className="detail-panel empty"><p>地図または一覧から樹木を選択してください。</p></aside>;
  const species = tree.japaneseName || tree.speciesOriginal || tree.scientificName || "樹種未設定";
  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <div><span className="eyebrow">{tree.externalTreeId ?? tree.treeId}</span><h2>{species}</h2>{tree.scientificName && <p className="scientific">{tree.scientificName}</p>}</div>
        <span className={`health health-${tree.healthCondition}`}>{LABELS[tree.healthCondition]}</span>
      </div>
      <dl className="detail-grid">
        <Detail label="胸高直径" value={format(tree.dbhCm, "cm")} /><Detail label="樹高" value={format(tree.totalHeightM, "m")} />
        <Detail label="樹冠幅 南北" value={format(tree.crownWidthNsM, "m")} /><Detail label="樹冠幅 東西" value={format(tree.crownWidthEwM, "m")} />
        <Detail label="調査日" value={tree.surveyDate ?? "—"} /><Detail label="管理状態" value={tree.status} />
      </dl>
      {tree.notes && <div className="notes"><h3>備考</h3><p>{tree.notes}</p></div>}
      {Object.keys(tree.customFields).length > 0 && <div className="custom-fields"><h3>追加項目</h3><dl>{Object.entries(tree.customFields).map(([key, value]) => <Detail key={key} label={key} value={value} />)}</dl></div>}
    </aside>
  );
}
function Detail({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function format(value: number | undefined, unit: string) { return value === undefined ? "—" : `${value.toLocaleString("ja-JP")} ${unit}`; }
