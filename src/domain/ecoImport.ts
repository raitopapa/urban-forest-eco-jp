import codes from "./ecoSpeciesCodes.json";
import { latestSurveyRows, type SurveyRow } from "./surveyRecords";

// Verified against i-Tree Eco's published species list (2023-01-17).
export const KNOWN_SPECIES: Record<string, string> = {
  "ケヤキ": "ZESE", "イチョウ": "GIBI", "ソメイヨシノ": "PRYE", "クスノキ": "CICA",
  "イロハモミジ": "ACPA", "ユリノキ": "LITU", "トチノキ": "AETU", "ハナミズキ": "COFL",
  "ヤマボウシ": "COKO", "シラカシ": "QUMY1", "アラカシ": "QUGL", "コナラ": "QUSE1",
  "クヌギ": "QUAC", "エノキ": "CESI4", "メタセコイア": "MEGL", "ラクウショウ": "TADI",
  "クロマツ": "PITH1", "アカマツ": "PIDE", "スギ": "CRJA", "ヒノキ": "CHOB",
};

export const ECO_SPECIES_CODES = new Set<string>(codes);
export type EcoCell = string | number | Date;
export type EcoTree = Record<string, EcoCell>;
export interface EcoIssue { tree: string; reason: string }
export interface EcoPreparation { rows: EcoTree[]; issues: EcoIssue[]; omitted: number; unmappedSpecies: string[] }

const CM_PER_INCH = 2.54;
const METRES_PER_FOOT = 0.3048;
function txt(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function num(value: unknown): number | undefined {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function rounded(value: number): number { return Math.round(value * 1000) / 1000; }
function ft(value: unknown): number | undefined {
  const n = num(value);
  return n === undefined ? undefined : rounded(n / METRES_PER_FOOT);
}
function isoDate(value: unknown): Date | undefined {
  const input = txt(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return undefined;
  const d = new Date(`${input}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input ? undefined : d;
}

export function prepareEcoImport(allRows: SurveyRow[], overrides: Record<string, string> = {}): EcoPreparation {
  const rows: EcoTree[] = [];
  const issues: EcoIssue[] = [];
  const unmapped = new Set<string>();
  const seenNos = new Set<string>();
  let omitted = 0;
  for (const row of latestSurveyRows(allRows)) {
    const p = row.payload ?? {};
    if (p.mode === "N") { omitted++; continue; }
    const no = txt(p.no) || row.tree_no;
    const species = txt(p.species);
    const code = (overrides[species] || KNOWN_SPECIES[species] || "").trim().toUpperCase();
    const diameters = Array.isArray(p.dbh) ? p.dbh.map(num) : [];
    const dbh = diameters[0];
    const reasons: string[] = [];
    if (p.life === "切株" || p.life === "不明") reasons.push("生育状態が切株または不明です");
    if (!no) reasons.push("樹木番号がありません");
    else if (seenNos.has(no)) reasons.push("同じ樹木番号が複数あります");
    seenNos.add(no);
    if (!species) reasons.push("樹種がありません");
    else if (!code) { reasons.push("i-Tree樹種コードが未設定です"); unmapped.add(species); }
    else if (!ECO_SPECIES_CODES.has(code)) { reasons.push(`樹種コード ${code} が公式リストにありません`); unmapped.add(species); }
    if (dbh === undefined || dbh < 0.5 * CM_PER_INCH) reasons.push("DBH1が未入力またはi-Treeの下限（1.27 cm）未満です");
    diameters.slice(1).forEach((n, index) => {
      if (n !== undefined && n < 0.5 * CM_PER_INCH) reasons.push(`DBH${index + 2}が下限未満です`);
    });
    if (p.date && !isoDate(p.date)) reasons.push("調査日が正しい日付ではありません");
    for (const [label, value, min, max] of [
      ["樹高", ft(p.ht), 0, 450], ["生存部樹高", ft(p.liveHt), 0, 450],
      ["樹冠基部高", ft(p.crownBase), 0, 450], ["DBH測定高", ft(p.dbhH), 0.1, 6],
      ["樹冠欠損率", num(p.missing), 0, 100], ["枝枯れ率", num(p.dieback), 0, 100],
      ["樹冠受光度", num(p.cle), -1, 5],
    ] as const) if (value !== undefined && (value < min || value > max)) reasons.push(`${label}がi-Treeの範囲外です`);
    const ns = num(p.cwNS), ew = num(p.cwEW);
    if (ns !== undefined && ew !== undefined && (ns < 0 || ew < 0 || ft((ns + ew) / 2)! > 300)) reasons.push("樹冠幅がi-Treeの範囲外です");
    const top = num(p.liveHt), base = num(p.crownBase);
    if (top !== undefined && base !== undefined && base > top) reasons.push("樹冠基部高が生存部樹高を超えています");
    if (reasons.length) { issues.push({ tree: no || row.source_record_id, reason: reasons.join("／") }); continue; }

    const record: EcoTree = { "User Tree ID": no, Species: code, "DBH 1 (in)": rounded(dbh! / CM_PER_INCH) };
    diameters.slice(1).forEach((n, index) => { if (n !== undefined) record[`DBH ${index + 2} (in)`] = rounded(n / CM_PER_INCH); });
    const date = isoDate(p.date);
    if (date) record["Survey Date"] = date;
    if (txt(p.surveyor)) record.Crew = txt(p.surveyor);
    const latitude = num(p.lat), longitude = num(p.lon);
    if (latitude !== undefined && Math.abs(latitude) <= 90) record.Latitude = latitude;
    if (longitude !== undefined && Math.abs(longitude) <= 180) record.Longitude = longitude;
    for (const [column, value] of [
      ["DBH measurement height (ft)", ft(p.dbhH)], ["Total tree height (ft)", ft(p.ht)],
      ["Height to live top (ft)", ft(p.liveHt)], ["Height to crown base (ft)", ft(p.crownBase)],
    ] as const) if (value !== undefined) record[column] = value;
    if (ns !== undefined && ew !== undefined) record["Crown width (ft)"] = ft((ns + ew) / 2)!;
    const missing = num(p.missing), cle = num(p.cle), dieback = num(p.dieback);
    if (missing !== undefined) record["Percent crown missing"] = missing;
    if (cle !== undefined) record["Crown light exposure"] = cle;
    if (p.life === "枯死") record["Crown health (dieback %)"] = 100;
    else if (dieback !== undefined) record["Crown health (dieback %)"] = dieback;
    if (txt(p.photo)) record["Photo ID"] = txt(p.photo);
    rows.push(record);
  }
  return { rows, issues, omitted, unmappedSpecies: [...unmapped].sort() };
}
