import { useMemo, useRef, useState, type FormEvent } from "react";
import { TreeDetails } from "./components/TreeDetails";
import { TreeMap } from "./components/TreeMap";
import { exportITreeCsv, parseTreeCsv } from "./domain/treeCsv";
import type { CsvIssue, TreeRecord } from "./domain/tree";
import { mapSurveyRows, type SurveyRow } from "./domain/surveyRecords";
import { getSupabaseClient } from "./lib/supabaseClient";
import sampleCsv from "../public/sample-trees.csv?raw";

const initial = parseTreeCsv(sampleCsv);

export default function App() {
  const [trees, setTrees] = useState<TreeRecord[]>(initial.trees);
  const [issues, setIssues] = useState<CsvIssue[]>(initial.issues);
  const [selectedTreeId, setSelectedTreeId] = useState<string | undefined>(initial.trees[0]?.treeId);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"sample" | "csv" | "cloud">("sample");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedInAs, setLoggedInAs] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filteredTrees = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? trees.filter((tree) => [tree.treeId, tree.externalTreeId, tree.speciesOriginal, tree.japaneseName, tree.scientificName].some((value) => value?.toLowerCase().includes(term))) : trees;
  }, [query, trees]);
  const selectedTree = trees.find((tree) => tree.treeId === selectedTreeId);
  const speciesCount = new Set(trees.map((tree) => tree.scientificName || tree.speciesOriginal).filter(Boolean)).size;
  const measuredDbh = trees.map((tree) => tree.dbhCm).filter((value): value is number => value !== undefined);
  const averageDbh = measuredDbh.length ? measuredDbh.reduce((sum, value) => sum + value, 0) / measuredDbh.length : 0;
  const attentionCount = trees.filter((tree) => ["poor", "critical", "dead"].includes(tree.healthCondition)).length;

  async function handleFile(file?: File) {
    if (!file) return;
    const result = parseTreeCsv(await file.text());
    setTrees(result.trees); setIssues(result.issues); setSelectedTreeId(result.trees[0]?.treeId);
    setSource("csv"); setQuery("");
  }
  function restoreSample() {
    setTrees(initial.trees); setIssues(initial.issues); setSelectedTreeId(initial.trees[0]?.treeId); setQuery("");
    setSource("sample");
    if (inputRef.current) inputRef.current.value = "";
  }
  async function loadSharedRecords() {
    const supabase = getSupabaseClient();
    const rows: SurveyRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from("survey_records")
        .select("id,owner_id,source_record_id,tree_no,created_at,payload")
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...((data ?? []) as SurveyRow[]));
      if (!data || data.length < 500) break;
    }
    const mapped = mapSurveyRows(rows);
    setTrees(mapped.trees); setIssues(mapped.issues);
    setSelectedTreeId(mapped.trees[0]?.treeId); setQuery(""); setSource("cloud");
  }
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setCloudError("");
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: membership, error: memberError } = await supabase.from("survey_members")
        .select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (memberError) throw memberError;
      if (!membership) throw new Error("共有先の利用者登録がありません。管理者に連絡してください。");
      await loadSharedRecords();
      setLoggedInAs(data.user.email ?? email.trim()); setPassword("");
    } catch (error) {
      await supabase.auth.signOut({ scope: "local" });
      setCloudError(error instanceof Error ? error.message : "ログインまたは読込に失敗しました。");
    } finally { setLoading(false); }
  }
  async function refreshSharedRecords() {
    setLoading(true); setCloudError("");
    try { await loadSharedRecords(); }
    catch (error) { setCloudError(error instanceof Error ? error.message : "読込に失敗しました。"); }
    finally { setLoading(false); }
  }
  async function signOut() {
    await getSupabaseClient().auth.signOut({ scope: "local" });
    setLoggedInAs(""); setEmail(""); setPassword(""); setCloudError(""); restoreSample();
  }
  function downloadITreeCsv() {
    const { csv, skippedTreeIds } = exportITreeCsv(trees);
    if (!csv) return;
    download(csv, "itree-eco-import-draft.csv", "text/csv;charset=utf-8");
    if (skippedTreeIds.length) setIssues((current) => [...current.filter((issue) => !issue.message.startsWith("i-Tree出力:")), { row: 0, severity: "warning", message: `i-Tree出力: 樹種またはDBH不足の${skippedTreeIds.length}件を除外しました。` }]);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">年輪</div>
        <div><p className="eyebrow">URBAN TREE INVENTORY</p><h1>Urban Forest Eco JP <span>MVP</span></h1></div>
        <div className="header-actions"><a className="button secondary" href="./field/">現地入力</a><button className="button secondary" onClick={restoreSample}>サンプルに戻す</button><label className="button primary">CSVを読み込む<input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} hidden /></label></div>
      </header>
      <main>
        <section className="cloud-controls" aria-label="共有記録">
          {loggedInAs ? <div className="cloud-session"><strong>共有DB: {loggedInAs}</strong><button className="button cloud-button" type="button" onClick={refreshSharedRecords} disabled={loading}>{loading ? "読込中…" : "共有記録を再読込"}</button><button className="button cloud-button" type="button" onClick={signOut}>ログアウト</button></div>
            : <form className="cloud-session" onSubmit={signIn}><strong>共有DBにログイン</strong><input aria-label="メールアドレス" type="email" autoComplete="username" placeholder="メールアドレス" value={email} onChange={(event) => setEmail(event.target.value)} required /><input aria-label="パスワード" type="password" autoComplete="current-password" placeholder="パスワード" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="button cloud-button" type="submit" disabled={loading}>{loading ? "読込中…" : "ログインして読込"}</button></form>}
          <span className="data-source">表示中: {source === "cloud" ? `共有記録 ${trees.length}本` : source === "csv" ? "読込CSV" : "サンプル5本"}</span>
          {cloudError && <p className="cloud-error" role="alert">{cloudError}</p>}
        </section>
        <section className="stats" aria-label="台帳集計">
          <Stat label="登録樹木" value={`${trees.length} 本`} /><Stat label="樹種" value={`${speciesCount} 種`} /><Stat label="平均DBH" value={`${averageDbh.toFixed(1)} cm`} /><Stat label="要確認" value={`${attentionCount} 本`} alert={attentionCount > 0} />
          <div className="stats-action"><button className="button export" onClick={downloadITreeCsv} disabled={!trees.length}>i-Tree用CSVを出力</button><small>現時点では項目変換案です。モデル計算は行いません。</small></div>
        </section>
        {issues.length > 0 && <details className="issues"><summary>取込結果：{issues.filter((i) => i.severity === "error").length}件のエラー、{issues.filter((i) => i.severity === "warning").length}件の注意</summary><ul>{issues.slice(0, 10).map((issue, index) => <li key={`${issue.row}-${index}`}>{issue.row ? `${issue.row}行目：` : ""}{issue.message}</li>)}</ul></details>}
        <section className="workspace">
          <div className="tree-list-panel">
            <div className="panel-heading"><div><p className="eyebrow">TREE RECORDS</p><h2>樹木台帳</h2></div><span>{filteredTrees.length}</span></div>
            <input className="search" type="search" placeholder="ID・樹種で検索" value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="tree-list">{filteredTrees.map((tree) => <button key={tree.treeId} className={`tree-row ${tree.treeId === selectedTreeId ? "selected" : ""}`} onClick={() => setSelectedTreeId(tree.treeId)}><span className={`condition-dot condition-${tree.healthCondition}`} /><span><strong>{tree.speciesOriginal || tree.japaneseName || tree.scientificName || "樹種未設定"}</strong><small>{tree.externalTreeId ?? tree.treeId}</small></span><span className="dbh">{tree.dbhCm ? `DBH ${tree.dbhCm} cm` : "DBH —"}</span></button>)}</div>
          </div>
          <div className="map-panel"><TreeMap trees={filteredTrees} selectedTreeId={selectedTreeId} onSelectTree={setSelectedTreeId} /></div>
          <TreeDetails tree={selectedTree} />
        </section>
      </main>
    </div>
  );
}
function Stat({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className={`stat ${alert ? "stat-alert" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
