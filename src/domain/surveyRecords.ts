import type { CsvIssue, TreeRecord } from "./tree";

export interface SurveyRow {
  id: string;
  owner_id: string;
  source_record_id: string;
  tree_no: string;
  created_at: string;
  payload: Record<string, unknown>;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | undefined {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? undefined : parsed;
}

function latestTime(row: SurveyRow): number {
  const updated = Date.parse(str(row.payload.updatedAt));
  return Number.isFinite(updated) ? updated : Date.parse(row.created_at) || 0;
}

export function latestSurveyRows(rows: SurveyRow[]): SurveyRow[] {
  const bySource = new Map<string, SurveyRow>();
  for (const row of rows) {
    const key = `${row.owner_id}:${row.source_record_id}`;
    const prior = bySource.get(key);
    if (!prior || latestTime(row) > latestTime(prior) ||
      (latestTime(row) === latestTime(prior) && row.created_at > prior.created_at)) {
      bySource.set(key, row);
    }
  }
  return [...bySource.values()];
}

export function mapSurveyRows(rows: SurveyRow[]): { trees: TreeRecord[]; issues: CsvIssue[] } {
  const trees: TreeRecord[] = [];
  const issues: CsvIssue[] = [];
  for (const row of latestSurveyRows(rows)) {
    const p = row.payload ?? {};
    const latitude = number(p.lat);
    const longitude = number(p.lon);
    const no = str(p.no) || row.tree_no || row.source_record_id;
    if (latitude === undefined || longitude === undefined || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      issues.push({ row: 0, severity: "warning", message: `${no}: 緯度・経度が未入力または範囲外のため地図・台帳から除外しました。` });
      continue;
    }
    const stems = Array.isArray(p.dbh) ? p.dbh.map(number).filter((value): value is number => value !== undefined && value > 0) : [];
    const photos = Array.isArray(p.photoReferences) ? p.photoReferences : [];
    const photoNames = photos.filter((photo): photo is Record<string, unknown> => typeof photo === "object" && photo !== null)
      .map((photo) => [str(photo.photo_no), str(photo.export_name)].filter(Boolean).join(" / "));
    const life = str(p.life);
    const customFields: Record<string, string> = {};
    for (const [label, value] of [["調査者", p.surveyor], ["調査モード", p.mode], ["立地", p.site],
      ["利用度", p.use], ["近接対象", p.near], ["写真No.", p.photo],
      ["写真参照", photoNames.join("、")], ["株立ちDBH", stems.length > 1 ? stems.join(" / ") + " cm" : ""]] as const) {
      const text = str(value);
      if (text) customFields[label] = text;
    }
    trees.push({
      treeId: row.id, externalTreeId: no, latitude, longitude,
      speciesOriginal: str(p.species) || undefined,
      surveyDate: str(p.date) || undefined,
      dbhCm: stems[0], totalHeightM: number(p.ht), crownBaseHeightM: number(p.crownBase),
      crownWidthNsM: number(p.cwNS), crownWidthEwM: number(p.cwEW),
      crownMissingPct: number(p.missing), diebackPct: number(p.dieback),
      crownLightExposure: number(p.cle),
      healthCondition: life === "枯死" ? "dead" : "unknown",
      status: life || "不明", notes: str(p.note) || undefined, customFields,
    });
  }
  return { trees, issues };
}
