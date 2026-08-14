import { describe, expect, it } from "vitest";
import { exportITreeCsv, parseTreeCsv } from "./treeCsv";

describe("parseTreeCsv", () => {
  it("maps Japanese headers and preserves custom fields", () => {
    const csv = ["管理ID,緯度,経度,樹種,胸高直径_cm,健全度,管理区域", "TK-001,36.0835,140.1111,ケヤキ,42.5,良好,A地区"].join("\n");
    const result = parseTreeCsv(csv);
    expect(result.trees).toHaveLength(1);
    expect(result.trees[0]).toMatchObject({ treeId: "TK-001", dbhCm: 42.5, healthCondition: "good", customFields: { 管理区域: "A地区" } });
    expect(result.issues).toHaveLength(0);
  });
  it("rejects rows with invalid coordinates", () => {
    const result = parseTreeCsv("管理ID,緯度,経度,樹種,胸高直径_cm\nTK-002,999,140,ソメイヨシノ,30");
    expect(result.trees).toHaveLength(0);
    expect(result.issues[0].severity).toBe("error");
  });
  it("exports only records with species and DBH", () => {
    const result = parseTreeCsv(["管理ID,緯度,経度,樹種,胸高直径_cm", "TK-001,36,140,ケヤキ,40", "TK-002,36.1,140.1,,20"].join("\n"));
    const exported = exportITreeCsv(result.trees);
    expect(exported.csv).toContain("Tree ID,Species,DBH");
    expect(exported.csv).toContain("TK-001,ケヤキ,40");
    expect(exported.skippedTreeIds).toEqual(["TK-002"]);
  });
});
