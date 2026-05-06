function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return safeNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeFilename(extension) {
  return `purchase-history-${todayDate()}.${extension}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toExportRows(rows) {
  return rows.map((row) => ({
    ID: row.id || "",
    Date: row.date || "",
    Supplier: row.supplier || "",
    Product: row.product || "",
    Type: row.type || "",
    Quantity: safeNumber(row.quantity),
    Unit: row.unit || "",
    "Unit Price": safeNumber(row.unitPrice),
    "Total Cost": safeNumber(row.cost),
  }));
}

function buildSummary(rows) {
  return {
    count: rows.length,
    quantity: rows.reduce((sum, row) => sum + safeNumber(row.quantity), 0),
    totalCost: rows.reduce((sum, row) => sum + safeNumber(row.cost), 0),
  };
}

function buildPrintableHtml(rows, title = "Purchase History") {
  const summary = buildSummary(rows);
  const tableRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.supplier)}</td>
      <td>${escapeHtml(row.product)}</td>
      <td>${escapeHtml(row.type)}</td>
      <td class="num">${formatMoney(row.quantity)}</td>
      <td>${escapeHtml(row.unit || "")}</td>
      <td class="num">BDT ${formatMoney(row.unitPrice)}</td>
      <td class="num">BDT ${formatMoney(row.cost)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; font-family: Arial, sans-serif; color: #111827; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    .meta { margin-bottom: 20px; color: #4b5563; font-size: 12px; }
    .summary { display: flex; gap: 18px; margin-bottom: 18px; font-size: 13px; }
    .summary span { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 700; }
    .num { text-align: right; white-space: nowrap; }
    @media print { body { padding: 18px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Generated on ${escapeHtml(new Date().toLocaleString("en-US"))}</div>
  <div class="summary">
    <span>Rows: ${summary.count}</span>
    <span>Total Quantity: ${formatMoney(summary.quantity)}</span>
    <span>Total Cost: BDT ${formatMoney(summary.totalCost)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Supplier</th>
        <th>Product</th>
        <th>Type</th>
        <th>Quantity</th>
        <th>Unit</th>
        <th>Unit Price</th>
        <th>Total Cost</th>
      </tr>
    </thead>
    <tbody>${tableRows || '<tr><td colspan="8">No purchase data found.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
}

function pdfSafeText(value) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(value) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdfText(content, x, y, size = 9, weight = "normal") {
  const font = weight === "bold" ? "/F2" : "/F1";
  return `BT ${font} ${size} Tf ${x} ${y} Td (${pdfEscape(content)}) Tj ET\n`;
}

function makePdfLine(x1, y1, x2, y2, width = 0.5) {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function makePdfFill(x, y, width, height, gray = 0.95) {
  return `${gray} g ${x} ${y} ${width} ${height} re f 0 g\n`;
}

function truncate(value, maxLength) {
  const text = pdfSafeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function makePurchasePdfBlob(rows) {
  const summary = buildSummary(rows);
  const pageWidth = 842;
  const pageHeight = 595;
  const pageStreams = [];
  let stream = "";
  let y = 530;
  let pageNumber = 1;

  const addHeader = () => {
    stream += makePdfText("Purchase History", 40, 558, 18, "bold");
    stream += makePdfText(`Generated: ${new Date().toLocaleString("en-US")}`, 40, 540, 8);
    stream += makePdfText(`Rows: ${summary.count}`, 600, 558, 9, "bold");
    stream += makePdfText(`Total Cost: BDT ${formatMoney(summary.totalCost)}`, 600, 540, 9, "bold");
    stream += makePdfFill(40, 505, 760, 22, 0.92);
    stream += makePdfText("Date", 48, 513, 8, "bold");
    stream += makePdfText("Supplier", 108, 513, 8, "bold");
    stream += makePdfText("Product", 228, 513, 8, "bold");
    stream += makePdfText("Type", 348, 513, 8, "bold");
    stream += makePdfText("Qty", 460, 513, 8, "bold");
    stream += makePdfText("Unit", 515, 513, 8, "bold");
    stream += makePdfText("Unit Price", 570, 513, 8, "bold");
    stream += makePdfText("Total Cost", 690, 513, 8, "bold");
    stream += makePdfLine(40, 505, 800, 505, 0.7);
    y = 486;
  };

  const finishPage = () => {
    stream += makePdfText(`Page ${pageNumber}`, 760, 28, 8);
    pageStreams.push(stream);
    stream = "";
    pageNumber += 1;
  };

  addHeader();
  rows.forEach((row) => {
    if (y < 52) {
      finishPage();
      addHeader();
    }
    stream += makePdfText(row.date || "", 48, y, 8);
    stream += makePdfText(truncate(row.supplier, 22), 108, y, 8);
    stream += makePdfText(truncate(row.product, 22), 228, y, 8);
    stream += makePdfText(truncate(row.type, 18), 348, y, 8);
    stream += makePdfText(formatMoney(row.quantity), 460, y, 8);
    stream += makePdfText(truncate(row.unit || "", 8), 515, y, 8);
    stream += makePdfText(`BDT ${formatMoney(row.unitPrice)}`, 570, y, 8);
    stream += makePdfText(`BDT ${formatMoney(row.cost)}`, 690, y, 8, "bold");
    stream += makePdfLine(40, y - 8, 800, y - 8, 0.25);
    y -= 20;
  });
  if (rows.length === 0) {
    stream += makePdfText("No purchase data found.", 48, y, 9);
  }
  finishPage();

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [${pageStreams.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pageStreams.length} >>\nendobj\n`,
  ];

  pageStreams.forEach((pageStream, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`${pageObjectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pageStreams.length * 2} 0 R /F2 ${4 + pageStreams.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj\n`);
    objects.push(`${contentObjectId} 0 obj\n<< /Length ${pageStream.length} >>\nstream\n${pageStream}endstream\nendobj\n`);
  });

  objects.push(`${3 + pageStreams.length * 2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);
  objects.push(`${4 + pageStreams.length * 2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function printPurchases(rows) {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildPrintableHtml(rows));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 300);
}

export function downloadPurchasesPdf(rows) {
  if (typeof document === "undefined") return;
  downloadBlob(makePurchasePdfBlob(rows), makeFilename("pdf"));
}

export async function downloadPurchasesExcel(rows) {
  if (typeof document === "undefined") return;
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(toExportRows(rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    makeFilename("xlsx")
  );
}
