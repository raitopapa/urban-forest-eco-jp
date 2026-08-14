import Papa from "papaparse";
import { buildHeaderLookup, FIELD_ALIASES, normalizeHealth, normalizeHeader } from "./fieldMappings";
import type { CsvImportResult, CsvIssue, TreeRecord } from "./tree";

type CsvRow = Record<string, string | undefined>;

function asText(row: CsvRow, header?: string): string | undefined {
  const value = header ? row[header]?.trim() : undefined;
  return value || undefined;
}
function asNumber(row: CsvRow, header?: string): number | undefined {
  const value = asText(row, header);
  if (value === undefined) return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}
function inRange(value: number | undefined, min: number, max: number): boolean {
  return value !== undefined && value >= min && value <= max;
}

export function parseTreeCsv(csv: string): CsvImportResult {
  const parsed = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim() });
  const headers = parsed.meta.fields ?? [];
  const lookup = buildHeaderLookup(headers);
  const mappedHeaders = new Set([...lookup.values()].map(normalizeHeader));
  const issues: CsvIssue[] = parsed.errors.map((error) => ({ row: (error.row ?? 0) + 2, severity: "error", message: error.message }));
  const trees: TreeRecord[] = [];

  parsed.data.forEach((row, index) => {
    const csvRowNumber = index + 2;
    const latitude = asNumber(row, lookup.get("latitude"));
    const longitude = asNumber(row, lookup.get("longitude"));
    if (!inRange(latitude, -90, 90) || !inRange(longitude, -180, 180)) {
      issues.push({ row: csvRowNumber, severity: "error", message: "緯度・経度が未入力、または範囲外です。" });
      return;
    }

    const externalTreeId = asText(row, lookup.get("externalTreeId"));
    const speciesOriginal = asText(row, lookup.get("speciesOriginal"));
    const scientificName = asText(row, lookup.get("scientificName"));
    const iTreeSpeciesCode = asText(row, lookup.get("iTreeSpeciesCode"));
    const dbhCm = asNumber(row, lookup.get("dbhCm"));
    const treeId = externalTreeId || `row-${String(csvRowNumber).padStart(4, "0")}`;

    if (!speciesOriginal && !scientificName && !iTreeSpeciesCode) {
      issues.push({ row: csvRowNumber, severity: "warning", message: `${treeId}: i-Tree出力に使える樹種情報がありません。` });
    }
    if (dbhCm === undefined || dbhCm <= 0) {
      issues.push({ row: csvRowNumber, severity: "warning", message: `${treeId}: 有効な胸高直径がありません。` });
    }

    const customFields = Object.fromEntries(Object.entries(row)
      .filter(([header, value]) => !mappedHeaders.has(normalizeHeader(header)) && value?.trim())
      .map(([header, value]) => [header, value!.trim()]));

    trees.push({
      treeId, externalTreeId, latitude: latitude!, longitude: longitude!, speciesOriginal,
      japaneseName: asText(row, lookup.get("japaneseName")), scientificName, iTreeSpeciesCode,
      surveyDate: asText(row, lookup.get("surveyDate")), dbhCm,
      dbhMeasurementHeightM: asNumber(row, lookup.get("dbhMeasurementHeightM")),
      totalHeightM: asNumber(row, lookup.get("totalHeightM")), crownBaseHeightM: asNumber(row, lookup.get("crownBaseHeightM")),
      crownWidthNsM: asNumber(row, lookup.get("crownWidthNsM")), crownWidthEwM: asNumber(row, lookup.get("crownWidthEwM")),
      crownMissingPct: asNumber(row, lookup.get("crownMissingPct")), diebackPct: asNumber(row, lookup.get("diebackPct")),
      crownLightExposure: asNumber(row, lookup.get("crownLightExposure")), healthCondition: normalizeHealth(asText(row, lookup.get("healthCondition"))),
      landUse: asText(row, lookup.get("landUse")), status: asText(row, lookup.get("status")) ?? "active",
      notes: asText(row, lookup.get("notes")), customFields,
    });
  });
  return { trees, issues };
}

export function exportITreeCsv(trees: TreeRecord[]): { csv: string; skippedTreeIds: string[] } {
  const eligible = trees.filter((tree) => (tree.iTreeSpeciesCode || tree.scientificName || tree.speciesOriginal) && tree.dbhCm && tree.dbhCm > 0);
  const skippedTreeIds = trees.filter((tree) => !eligible.includes(tree)).map((tree) => tree.treeId);
  const rows = eligible.map((tree) => ({
    "Tree ID": tree.externalTreeId ?? tree.treeId,
    Species: tree.iTreeSpeciesCode ?? tree.scientificName ?? tree.speciesOriginal,
    DBH: tree.dbhCm,
    "Total Tree Height": tree.totalHeightM ?? "", "Crown Base Height": tree.crownBaseHeightM ?? "",
    "Crown Width": average(tree.crownWidthNsM, tree.crownWidthEwM) ?? "",
    "Percent Crown Missing": tree.crownMissingPct ?? "", "Crown Light Exposure": tree.crownLightExposure ?? "",
    "Tree Condition": tree.healthCondition === "unknown" ? "" : tree.healthCondition, "Land Use": tree.landUse ?? "",
  }));
  return { csv: Papa.unparse(rows), skippedTreeIds };
}

function average(a?: number, b?: number): number | undefined {
  const values = [a, b].filter((value): value is number => value !== undefined);
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : undefined;
}

export const SUPPORTED_HEADERS = Object.values(FIELD_ALIASES).flat();
