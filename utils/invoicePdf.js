function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMoney(value) {
  return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
}

function formatMoneyValue(value) {
  return normalizeMoney(value).toLocaleString("en-US", {
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

function formatPdfMoney(value) {
  return `BDT ${formatMoneyValue(value)}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function findCustomerForSale(sale, customerRows = []) {
  const saleCustomerId = normalize(sale.customerId || sale.customerID || sale.customerCode);
  const saleCustomerName = normalize(sale.customerName || sale.companyName || sale.customer);

  return customerRows.find((customer) => {
    const customerId = normalize(customer.id || customer.customerId || customer.customerID || customer.code);
    const customerName = normalize(customer.name || customer.customerName || customer.companyName);
    return (saleCustomerId && customerId === saleCustomerId) || (saleCustomerName && customerName === saleCustomerName);
  });
}

function pdfSafeText(value) {
  return String(value ?? "")
    .replace(/\u09F3/g, "BDT ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(value) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdfText(content, x, y, size = 10, weight = "normal") {
  const font = weight === "bold" ? "/F2" : "/F1";
  return `BT ${font} ${size} Tf ${x} ${y} Td (${pdfEscape(content)}) Tj ET\n`;
}

function makePdfCenteredText(content, centerX, y, size = 10, weight = "normal") {
  const estimatedWidth = content.length * size * 0.52;
  const x = centerX - estimatedWidth / 2;
  return makePdfText(content, x, y, size, weight);
}

function makePdfRgbText(content, x, y, size = 10, weight = "normal", r = 0, g = 0, b = 0) {
  return `${r} ${g} ${b} rg\n${makePdfText(content, x, y, size, weight)}0 0 0 rg\n`;
}

function makePdfLine(x1, y1, x2, y2, width = 0.5) {
  return `${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
}

function makePdfRgbFill(x, y, width, height, r = 1, g = 1, b = 1) {
  return `${r} ${g} ${b} rg ${x} ${y} ${width} ${height} re f 0 0 0 rg\n`;
}

function makePdfStrokeRect(x, y, width, height, r = 0, g = 0, b = 0, lineWidth = 0.5) {
  return `${r} ${g} ${b} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S 0 0 0 RG\n`;
}

function buildInvoicePdfBlob(sale, companySettings, customerRows = []) {
  const company = companySettings?.company || {};
  const matchedCustomer = findCustomerForSale(sale, customerRows) || {};
  const invoiceNo = sale.invoiceNo || sale.id || "INV";
  const items = Array.isArray(sale.description) ? sale.description : [];
  const customerName = sale.customerName || sale.companyName || matchedCustomer.name || matchedCustomer.customerName || "Walk-in Customer";
  const customerType = sale.saleType || sale.customerCategory || matchedCustomer.type || "";
  const customerPhone = sale.customerPhone || sale.phone || matchedCustomer.phone || "";
  const customerEmail = sale.customerEmail || sale.email || matchedCustomer.email || "";
  const customerAddress = sale.customerAddress || sale.address || matchedCustomer.address || "";
  const date = sale.invoiceDate || sale.date || todayDate();
  const status = sale.status || (safeNumber(sale.balanceDue) <= 0 ? "Paid" : "Partial");
  const subtotal = safeNumber(sale.subtotal || sale.total);
  const discount = safeNumber(sale.discount);
  const tax = safeNumber(sale.tax || sale.vat);
  const total = safeNumber(sale.total);
  const paid = safeNumber(sale.paid);
  const previousDue = safeNumber(sale.previousDue || sale.previousBalance || sale.openingDue);
  const due = safeNumber(sale.balanceDue ?? total - paid);
  const totalDue = safeNumber(sale.totalDue) || previousDue + due;

  let stream = "";
  stream += makePdfRgbFill(0, 0, 595, 842, 0.97, 0.98, 1);
  stream += makePdfRgbFill(28, 70, 539, 720, 1, 1, 1);
  stream += makePdfStrokeRect(28, 70, 539, 720, 0.82, 0.86, 0.91, 0.9);
  stream += makePdfRgbFill(28, 70, 539, 62, 0.96, 0.98, 1);

  stream += makePdfRgbText(company.name || "Bakery ERP", 50, 760, 21, "bold", 1, 0.56, 0);
  stream += makePdfText(company.address || "Dhaka, Bangladesh", 50, 738, 9);
  stream += makePdfText(`Phone: ${company.contactNumber || company.phone || ""}`, 50, 726, 9);
  stream += makePdfText(`Email: ${company.email || ""}`, 50, 714, 9);
  stream += makePdfRgbText("INVOICE", 486, 760, 16, "bold", 1, 0.56, 0);

  stream += makePdfLine(28, 665, 567, 665, 0.7);
  stream += makePdfText("BILL TO", 50, 635, 8, "bold");
  stream += makePdfText(customerName, 50, 616, 12, "bold");
  let customerY = 600;
  if (customerType) { stream += makePdfText(customerType, 50, customerY, 9); customerY -= 13; }
  if (customerAddress) { stream += makePdfText(`Address: ${customerAddress}`, 50, customerY, 9); customerY -= 13; }
  if (customerPhone) { stream += makePdfText(`Mobile: ${customerPhone}`, 50, customerY, 9); customerY -= 13; }
  if (customerEmail) { stream += makePdfText(`Email: ${customerEmail}`, 50, customerY, 9); }

  stream += makePdfText("INVOICE DETAILS", 325, 635, 8, "bold");
  stream += makePdfText(`Invoice ID: ${invoiceNo}`, 325, 616, 10, "bold");
  stream += makePdfText(`Date: ${date}`, 325, 600, 10);
  stream += makePdfText(`Status: ${status}`, 325, 584, 10);
  stream += makePdfText(`Payment: ${formatPdfMoney(paid)}`, 325, 568, 10);
  if (previousDue > 0) {
    stream += makePdfText(`Previous Due: ${formatPdfMoney(previousDue)}`, 325, 552, 10, "bold");
    stream += makePdfText(`Balance Due: ${formatPdfMoney(due)}`, 325, 536, 10, "bold");
    stream += makePdfText(`Total Due: ${formatPdfMoney(totalDue)}`, 325, 522, 10, "bold");
  } else {
    stream += makePdfText(`Balance Due: ${formatPdfMoney(due)}`, 325, 552, 10, "bold");
  }

  stream += makePdfLine(28, previousDue > 0 ? 512 : 520, 567, previousDue > 0 ? 512 : 520, 0.7);
  stream += makePdfRgbFill(50, 480, 495, 24, 0.94, 0.96, 0.98);
  stream += makePdfText("DESCRIPTION", 62, 488, 8, "bold");
  stream += makePdfText("QTY", 330, 488, 8, "bold");
  stream += makePdfText("UNIT PRICE", 390, 488, 8, "bold");
  stream += makePdfText("AMOUNT", 500, 488, 8, "bold");

  let y = 458;
  items.forEach((item, index) => {
    if (y < 230) return;
    stream += makePdfText(item.name || `Item ${index + 1}`, 62, y, 9);
    stream += makePdfText(String(safeNumber(item.quantity)), 335, y, 9);
    stream += makePdfText(formatPdfMoney(item.unitPrice), 390, y, 9);
    stream += makePdfText(formatPdfMoney(item.amount ?? item.total), 500, y, 9);
    stream += makePdfLine(50, y - 11, 545, y - 11, 0.3);
    y -= 24;
  });

  const summaryY = 200;
  stream += makePdfLine(325, summaryY + 72, 545, summaryY + 72, 0.9);
  stream += makePdfText("Subtotal:", 350, summaryY + 54, 10);
  stream += makePdfText(formatPdfMoney(subtotal), 485, summaryY + 54, 10);
  stream += makePdfText("Discount:", 350, summaryY + 36, 10);
  stream += makePdfText(`- ${formatPdfMoney(discount)}`, 485, summaryY + 36, 10);
  stream += makePdfText("VAT:", 350, summaryY + 18, 10);
  stream += makePdfText(formatPdfMoney(tax), 485, summaryY + 18, 10);
  stream += makePdfText("Total:", 350, summaryY, 12, "bold");
  stream += makePdfRgbText(formatPdfMoney(total), 485, summaryY, 12, "bold", 1, 0.56, 0);
  stream += makePdfText("Paid:", 350, summaryY - 22, 10);
  stream += makePdfRgbText(formatPdfMoney(paid), 485, summaryY - 22, 10, "bold", 0, 0.6, 0.25);
  if (previousDue > 0) {
    stream += makePdfText("Previous Due:", 350, summaryY - 44, 10, "bold");
    stream += makePdfRgbText(formatPdfMoney(previousDue), 485, summaryY - 44, 10, "bold", 0.9, 0, 0);
    stream += makePdfText("Balance Due:", 350, summaryY - 66, 10, "bold");
    stream += makePdfRgbText(formatPdfMoney(due), 485, summaryY - 66, 10, "bold", 0.9, 0, 0);
    stream += makePdfText("Total Due:", 350, summaryY - 88, 12, "bold");
    stream += makePdfRgbText(formatPdfMoney(totalDue), 485, summaryY - 88, 12, "bold", 0.9, 0, 0);
  } else {
    stream += makePdfText("Balance Due:", 350, summaryY - 44, 10, "bold");
    stream += makePdfRgbText(formatPdfMoney(due), 485, summaryY - 44, 10, "bold", 0.9, 0, 0);
  }
  const pageCenter = 297.5;
  stream += makePdfCenteredText("Thank you for your business!", pageCenter, 100, 9);
  stream += makePdfCenteredText(`Generated by ${company.name || "Bakery ERP"} on ${new Date().toLocaleDateString("en-US")}`, pageCenter, 86, 8);

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => { offsets.push(pdf.length); pdf += object; });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function openInvoicePdf(sale, companySettings, customerRows = []) {
  if (typeof window === "undefined") return;
  const blob = buildInvoicePdfBlob(sale, companySettings, customerRows);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadInvoicePdf(sale, companySettings, customerRows = []) {
  if (typeof document === "undefined") return;
  const blob = buildInvoicePdfBlob(sale, companySettings, customerRows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const invoiceNo = sale.invoiceNo || sale.id || "invoice";
  link.href = url;
  link.download = `${invoiceNo}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function printInvoicePdf(sale, companySettings, customerRows = []) {
  if (typeof window === "undefined") return;
  const blob = buildInvoicePdfBlob(sale, companySettings, customerRows);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!printWindow) {
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  printWindow.addEventListener("load", () => {
    printWindow.focus();
    printWindow.print();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}
