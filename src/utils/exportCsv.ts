/**
 * Utility to export an array of rows to a downloadable CSV file.
 * Formatted with UTF-8 BOM and semicolon separators for seamless parsing in Microsoft Excel.
 */
export function exportToCsv(data: (string | number)[][], filename: string, headers: string[]) {
  const csvContent = "\uFEFF" + [
    headers.join(";"),
    ...data.map(row => row.map(val => {
      const strVal = String(val);
      if (strVal.includes(";") || strVal.includes("\"") || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(";")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
