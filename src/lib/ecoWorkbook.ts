import type { EcoTree } from "../domain/ecoImport";

const HEADERS = ["User Tree ID", "Species", "DBH 1 (in)", "DBH 2 (in)", "DBH 3 (in)",
  "DBH 4 (in)", "DBH 5 (in)", "DBH 6 (in)", "Survey Date", "Crew", "Latitude", "Longitude",
  "DBH measurement height (ft)", "Total tree height (ft)", "Height to live top (ft)",
  "Height to crown base (ft)", "Crown width (ft)", "Percent crown missing",
  "Crown health (dieback %)", "Crown light exposure", "Photo ID"];

export async function ecoWorkbook(rows: EcoTree[]): Promise<Blob> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Trees");
  const headers = HEADERS.filter((header) => rows.some((row) => row[header] !== undefined));
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(headers.map((header) => row[header] ?? null));
  sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true }; });
  for (const column of sheet.columns) column.width = 24;
  const dateIndex = headers.indexOf("Survey Date") + 1;
  if (dateIndex) sheet.getColumn(dateIndex).numFmt = "yyyy-mm-dd";
  const bytes = await workbook.xlsx.writeBuffer();
  return new Blob([bytes as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
