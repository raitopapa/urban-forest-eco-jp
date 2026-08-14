import type { HealthCondition } from "./tree";

export const FIELD_ALIASES = {
  externalTreeId: ["tree_id", "external_tree_id", "管理id", "樹木id", "qr_id", "tree id", "user id"],
  latitude: ["latitude", "lat", "緯度"], longitude: ["longitude", "lng", "lon", "経度"],
  speciesOriginal: ["species_original", "樹種", "樹種名", "species"], japaneseName: ["japanese_name", "和名"],
  scientificName: ["scientific_name", "学名", "botanical name"], iTreeSpeciesCode: ["i_tree_species_code", "itree_code", "i-tree樹種コード"],
  surveyDate: ["survey_date", "調査日"], dbhCm: ["dbh_cm", "胸高直径_cm", "胸高直径", "dbh"],
  dbhMeasurementHeightM: ["dbh_measurement_height_m", "直径測定高_m", "測定高_m"], totalHeightM: ["total_height_m", "樹高_m", "樹高", "total tree height"],
  crownBaseHeightM: ["crown_base_height_m", "樹冠下高_m", "crown base height"], crownWidthNsM: ["crown_width_ns_m", "樹冠幅ns_m", "樹冠幅南北_m"],
  crownWidthEwM: ["crown_width_ew_m", "樹冠幅ew_m", "樹冠幅東西_m"], crownMissingPct: ["crown_missing_pct", "欠損樹冠率_pct", "percent crown missing"],
  diebackPct: ["dieback_pct", "枝枯れ率_pct", "dieback"], crownLightExposure: ["crown_light_exposure", "cle", "受光面数"],
  healthCondition: ["health_condition", "健全度", "樹勢", "tree condition"], landUse: ["land_use", "周辺土地利用", "土地利用"],
  status: ["status", "管理状態", "現況"], notes: ["notes", "備考", "メモ"],
} as const;

export type CanonicalField = keyof typeof FIELD_ALIASES;
export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[（）]/g, (char) => char === "（" ? "(" : ")").replace(/\s+/g, " ");
}
export function buildHeaderLookup(headers: string[]): Map<CanonicalField, string> {
  const normalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  const lookup = new Map<CanonicalField, string>();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [CanonicalField, readonly string[]][]) {
    const match = aliases.map(normalizeHeader).find((alias) => normalized.has(alias));
    if (match) lookup.set(field, normalized.get(match)!);
  }
  return lookup;
}
const HEALTH_MAP: Record<string, HealthCondition> = {
  good: "good", 良好: "good", 健全: "good", fair: "fair", 普通: "fair", やや不良: "fair",
  poor: "poor", 不良: "poor", critical: "critical", 危険: "critical", dead: "dead", 枯死: "dead",
};
export function normalizeHealth(value?: string): HealthCondition {
  return value ? HEALTH_MAP[value.trim().toLowerCase()] ?? "unknown" : "unknown";
}
