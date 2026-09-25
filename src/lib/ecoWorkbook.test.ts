import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { ecoWorkbook } from "./ecoWorkbook";

it("writes a readable one-sheet import workbook with numeric DBH and survey date", async () => {
  const blob = await ecoWorkbook([{ "User Tree ID": "1-001", Species: "LITU", "DBH 1 (in)": 10,
    "DBH 2 (in)": 5, "Survey Date": new Date("2026-09-23T12:00:00Z") }]);
  const excel = new ExcelJS.Workbook();
  await excel.xlsx.load(await blob.arrayBuffer());
  expect(excel.worksheets).toHaveLength(1);
  const sheet = excel.getWorksheet("Trees")!;
  expect(sheet.getCell("A1").value).toBe("User Tree ID");
  expect(sheet.getCell("A2").value).toBe("1-001");
  expect(sheet.getCell("C2").value).toBe(10);
  expect(sheet.getCell("D2").value).toBe(5);
  expect(sheet.getCell("E2").value).toBeInstanceOf(Date);
});
