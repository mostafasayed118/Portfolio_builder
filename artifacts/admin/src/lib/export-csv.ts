/**
 * Generic CSV export utility for admin data tables.
 * Used by Skills, Projects, Experience, Certifications, Messages managers.
 *
 * Usage:
 *   import { exportToCsv } from "@/lib/export-csv";
 *   exportToCsv(items, ["name", "category", "proficiency"], "skills.csv");
 */

export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string,
): void {
  const csvHeader = columns.map((c) => csvEscape(c.label)).join(",");
  const csvRows = rows.map((row) =>
    columns.map((c) => csvEscape(String(row[c.key] ?? ""))).join(","),
  );
  const csv = [csvHeader, ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
