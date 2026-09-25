import { describe, expect, it } from "vitest";
import { prepareEcoImport } from "./ecoImport";
import type { SurveyRow } from "./surveyRecords";

const survey: SurveyRow = { id: "1", owner_id: "user", source_record_id: "source-1", tree_no: "1-001",
  created_at: "2026-09-25T07:43:10Z", payload: { no: "1-001", species: "ユリノキ", mode: "B", life: "生存",
    dbh: ["25.4", "12.7", "", "", "", ""], ht: "10", crownBase: "2", liveHt: "9",
    cwNS: "4", cwEW: "6", missing: "13", dieback: "8", cle: "3", date: "2026-09-23",
    lat: "36.094623", lon: "140.067106", surveyor: "担当A", updatedAt: "2026-09-25T07:40:00Z" } };

describe("i-Tree Eco inventory preparation", () => {
  it("preserves multi-stem measurements, converts metric units, uses User Tree ID", () => {
    const prepared = prepareEcoImport([survey]);
    expect(prepared.issues).toEqual([]);
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.rows[0]).toMatchObject({ "User Tree ID": "1-001", Species: "LITU", "DBH 1 (in)": 10,
      "DBH 2 (in)": 5, "Crown width (ft)": 16.404, "Percent crown missing": 13,
      "Crown health (dieback %)": 8, "Crown light exposure": 3, "Survey Date": new Date("2026-09-23T12:00:00Z") });
    expect(prepared.rows[0]).not.toHaveProperty("DBH 3 (in)");
  });

  it("ignores N mode and blocks missing data without silently dropping evaluated trees", () => {
    const skipped = { ...survey, id: "2", source_record_id: "source-2", payload: { ...survey.payload, no: "1-002", mode: "N" } };
    const invalid = { ...survey, id: "3", source_record_id: "source-3", payload: { ...survey.payload, no: "1-003", species: "その他の木", dbh: [""], mode: "A" } };
    const prepared = prepareEcoImport([survey, skipped, invalid]);
    expect(prepared.omitted).toBe(1);
    expect(prepared.issues).toHaveLength(1);
    expect(prepared.unmappedSpecies).toEqual(["その他の木"]);
    expect(prepared.rows).toHaveLength(1);
    expect(prepared.issues[0].reason).toContain("DBH1");
  });

  it("selects the latest sent revision and accepts only a code on the official list", () => {
    const changed = { ...survey, id: "new", created_at: "2026-09-25T08:00:00Z",
      payload: { ...survey.payload, species: "その他の木", updatedAt: "2026-09-25T07:59:00Z" } };
    expect(prepareEcoImport([survey, changed], { "その他の木": "LITU" }).rows).toHaveLength(1);
    expect(prepareEcoImport([survey, changed], { "その他の木": "BAD_CODE" }).issues).toHaveLength(1);
  });
});
