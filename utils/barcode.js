export function normalizeBarcodePart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function ean13CheckDigit(first12Digits) {
  const digits = String(first12Digits).replace(/\D/g, "").slice(0, 12).padStart(12, "0");
  const sum = digits.split("").reduce((total, digit, index) => {
    const n = Number(digit);
    return total + n * (index % 2 === 0 ? 1 : 3);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}

export function generateProductBarcode({ productName, packetSize, type }) {
  const key = `${normalizeBarcodePart(type)}|${normalizeBarcodePart(productName)}|${normalizeBarcodePart(packetSize)}`;
  const hash = String(hashText(key)).padStart(10, "0").slice(-10);
  const first12 = `29${hash}`.slice(0, 12);
  return `${first12}${ean13CheckDigit(first12)}`;
}

export function resolveProductBarcode(row = {}) {
  const manual = String(row.barcode || row.productBarcode || "").trim();
  if (manual) return manual;
  return generateProductBarcode({
    productName: row.productName || row.product || row.name || row.originalProduct,
    packetSize: row.packetSize || row.unit || "pcs",
    type: row.type || row.sourceType || row.purchaseType || "Finished Product",
  });
}

export function barcodeHtmlBars(code) {
  const digits = String(code || "").replace(/\D/g, "") || String(code || "");
  return digits
    .split("")
    .map((char, index) => {
      const width = 1 + ((char.charCodeAt(0) + index) % 4);
      return `<span style="display:inline-block;width:${width}px;height:44px;background:#111;margin-right:1px"></span>`;
    })
    .join("");
}
