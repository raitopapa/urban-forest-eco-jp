import { describe, expect, it } from "vitest";
import { mapSurveyRows, type SurveyRow } from "./surveyRecords";

const base: SurveyRow = {
  id: "cloud-1", owner_id: "user-1", source_record_id: "4e412ee0-28ab-406f-84c5-66a7a1c85a49",
  tree_no: "1-001", created_at: "2026-09-25T07:43:10Z",
  payload: { no: "1-001", species: "ユリノキ", lat: "36.094623", lon: "140.067106", dbh: ["", ""],
    ht: "", life: "生存", date: "2026-09-23", updatedAt: "2026-09-25T07:38:33Z" },
};

describe("shared survey record display", () => {
  it("shows a sparse real survey record as one mapped tree", () => {
    const { trees, issues } = mapSurveyRows([base]);
    expect(issues).toEqual([]);
    expect(trees).toHaveLength(1);
    expect(trees[0]).toMatchObject({ externalTreeId: "1-001", speciesOriginal: "ユリノキ",
      latitude: 36.094623, longitude: 140.067106, dbhCm: undefined, totalHeightM: undefined,
      status: "生存", healthCondition: "unknown" });
  });

  it("shows the latest edit once and skips invalid coordinates with a warning", () => {
    const updated = { ...base, id: "cloud-2", created_at: "2026-09-25T08:00:00Z",
      payload: { ...base.payload, dbh: ["31", "22"], updatedAt: "2026-09-25T07:59:00Z" } };
    const invalid = { ...base, id: "cloud-3", source_record_id: "other", payload: { lat: "", lon: "140", no: "1-002" } };
    const { trees, issues } = mapSurveyRows([updated, base, invalid]);
    expect(trees).toHaveLength(1);
    expect(trees[0].dbhCm).toBe(31);
    expect(trees[0].customFields["株立ちDBH"]).toBe("31 / 22 cm");
    expect(issues).toHaveLength(1);
  });
});
