export type HealthCondition = "good" | "fair" | "poor" | "critical" | "dead" | "unknown";

export interface TreeRecord {
  treeId: string;
  externalTreeId?: string;
  latitude: number;
  longitude: number;
  speciesOriginal?: string;
  japaneseName?: string;
  scientificName?: string;
  iTreeSpeciesCode?: string;
  surveyDate?: string;
  dbhCm?: number;
  dbhMeasurementHeightM?: number;
  totalHeightM?: number;
  crownBaseHeightM?: number;
  crownWidthNsM?: number;
  crownWidthEwM?: number;
  crownMissingPct?: number;
  diebackPct?: number;
  crownLightExposure?: number;
  healthCondition: HealthCondition;
  landUse?: string;
  status: string;
  notes?: string;
  customFields: Record<string, string>;
}

export interface CsvIssue { row: number; severity: "error" | "warning"; message: string }
export interface CsvImportResult { trees: TreeRecord[]; issues: CsvIssue[] }
