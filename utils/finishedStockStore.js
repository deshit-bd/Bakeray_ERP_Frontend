import { readPurchases } from "./purchaseStore";
import { resolveProductBarcode } from "./barcode";

export const FINISHED_STOCK_STORAGE_KEY = "erp_finished_stock_rows_v1";
export const REPACK_PRODUCT_HISTORY_STORAGE_KEY = "erp-repack-product-history";
export const OUTSIDE_PRODUCT_STORAGE_KEY = "erp-outside-products";
export const INVOICES_STORAGE_KEY = "erp-invoice-rows";

export const defaultOwnProductionRows = [];

export const defaultRepackRows = [];

export const defaultOutsideRows = [];

function readStoredArray(key) {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeFinishedStockKey(productName, packetSize) {
  return `${String(productName || "").trim().toLowerCase()}::${String(packetSize || "1kg").trim().toLowerCase()}`;
}

function makeVariantKey(row) {
  return `${String(row.type || row.sourceType || "Own Production").trim().toLowerCase()}::${String(row.productName || row.product || row.name || "").trim().toLowerCase()}::${String(row.packetSize || row.unit || "1kg").trim().toLowerCase()}`;
}

function parseSoldProductName(name) {
  const text = String(name || "").trim();
  const matched = text.match(/^(.*)\s+\(([^)]+)\)$/);

  if (!matched) {
    return { productName: text, packetSize: "1kg" };
  }

  return {
    productName: matched[1].trim(),
    packetSize: matched[2].trim(),
  };
}

function isRepackDemoRow(item) {
  return item.id === "RP-001" && item.originalProduct === "Bulk Pancake Mix";
}

function isOutsideDemoRow(item) {
  return (
    (item.id === "OP-001" && item.product === "Imported Cake Flour") ||
    (item.id === "OP-002" && item.product === "Premium Biscuits")
  );
}


function aggregateFinishedRows(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const productName = String(row.productName || row.product || row.name || "").trim();
    const type = String(row.type || row.sourceType || "Own Production").trim() || "Own Production";
    const packetSize = String(row.packetSize || row.unit || "1kg").trim() || "1kg";
    const quantity = Number(row.quantity || row.stock || row.available || 0);
    if (!productName || quantity <= 0) return;

    const key = `${type.toLowerCase()}::${productName.toLowerCase()}::${packetSize.toLowerCase()}`;
    const existing = grouped.get(key) || {
      id: row.id || `FS-${grouped.size + 1}`,
      productName,
      type,
      packetSize,
      quantity: 0,
      pricePerUnit: 0,
      totalValue: 0,
    };
    const pricePerUnit = Number(row.pricePerUnit || row.pricePerPacket || row.sellingPricePerUnit || row.costPerUnit || 0);
    existing.quantity += quantity;
    existing.totalValue += quantity * pricePerUnit;
    existing.pricePerUnit = existing.quantity > 0 ? existing.totalValue / existing.quantity : pricePerUnit;
    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).map(({ totalValue, ...row }) => row);
}

function normalizeFinishedStockRow(item, index) {
  return {
    id: item.id || item.stockCode || `FS-DB-${index + 1}`,
    productName: item.productName || item.product || item.name || "",
    type: item.type || item.sourceType || "Own Production",
    packetSize: item.packetSize || item.unit || "1kg",
    quantity: Number(item.quantity || item.stock || item.available || 0),
    pricePerUnit: Number(item.pricePerUnit || item.pricePerPacket || item.sellingPricePerUnit || item.costPerUnit || 0),
    barcode: item.barcode || item.productBarcode || resolveProductBarcode(item),
  };
}
function normalizeOwnProductionRow(item, index) {
  return {
    id: item.id || `FS-OWN-LOCAL-${index + 1}`,
    productName: item.productName || item.product || "",
    type: "Own Production",
    packetSize: item.packetSize || "1kg",
    quantity: Number(item.quantity || 0),
    pricePerUnit: Number(item.pricePerUnit || item.pricePerPacket || 0),
    barcode: item.barcode || item.productBarcode || resolveProductBarcode({ ...item, type: "Own Production" }),
  };
}

function mapRepackRows(history) {
  return history
    .filter((item) => !isRepackDemoRow(item))
    .map((item) => ({
      id: `FS-${item.id}`,
      productName: item.originalProduct || item.product || item.productName || "",
      type: "Repack",
      packetSize: item.packetSize || "1kg",
      quantity: Number(item.packets || item.quantity || 0),
      pricePerUnit: Number(item.pricePerUnit || item.sellingPrice || 0),
      barcode: item.barcode || item.productBarcode || resolveProductBarcode({ ...item, type: "Repack" }),
    }));
}

function mapOutsideRows(products) {
  return products
    .filter((item) => !isOutsideDemoRow(item))
    .map((item) => ({
      id: `FS-${item.id}`,
      productName: item.product || item.productName || "",
      type: "Outside Product",
      packetSize: item.packetSize || item.unit || "pcs",
      quantity: Number(item.quantity || 0),
      pricePerUnit: Number(item.sellingPricePerUnit || item.costPerUnit || 0),
      barcode: item.barcode || item.productBarcode || resolveProductBarcode({ ...item, productName: item.product || item.productName, type: "Outside Product" }),
    }));
}

function mapOutsidePurchaseRows(purchases = readPurchases()) {
  return purchases
    .filter((purchase) => purchase.type === "Outside Product")
    .map((purchase) => {
      const quantity = Number(purchase.quantity || 0);

      return {
        id: `FS-${purchase.id}`,
        productName: purchase.product || "",
        type: "Outside Product",
        packetSize: purchase.unit || "pcs",
        quantity,
        pricePerUnit: quantity > 0 ? Number(purchase.cost || 0) / quantity : 0,
        sourceSupplier: purchase.supplier || "",
        barcode: purchase.barcode || resolveProductBarcode({ productName: purchase.product, packetSize: purchase.unit || "pcs", type: "Outside Product" }),
      };
    });
}

function readSoldQuantityByKey() {
  const soldByKey = new Map();

  readStoredArray(INVOICES_STORAGE_KEY).forEach((invoice) => {
    (invoice.description || []).forEach((item) => {
      const parsed = parseSoldProductName(item.name || item.productName);
      const key = makeFinishedStockKey(parsed.productName, parsed.packetSize);
      soldByKey.set(key, (soldByKey.get(key) || 0) + Number(item.quantity || 0));
    });
  });

  return soldByKey;
}

function applySoldQuantity(rows) {
  const soldByKey = readSoldQuantityByKey();

  return rows
    .map((row) => {
      const key = makeFinishedStockKey(row.productName, row.packetSize);
      const soldQuantity = Number(soldByKey.get(key) || 0);
      if (soldQuantity <= 0) return row;

      const consumedFromRow = Math.min(Number(row.quantity || 0), soldQuantity);
      soldByKey.set(key, soldQuantity - consumedFromRow);

      return {
        ...row,
        quantity: Math.max(Number(row.quantity || 0) - consumedFromRow, 0),
      };
    })
    .filter((row) => Number(row.quantity || 0) > 0);
}

export function readFinishedStockRows() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(FINISHED_STOCK_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFinishedStockRows(rows) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FINISHED_STOCK_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore localStorage write issues.
  }
}

export function addFinishedStockRow(row) {
  const currentRows = readFinishedStockRows();
  const normalizedRow = { ...row, barcode: row.barcode || resolveProductBarcode(row) };
  const key = makeVariantKey(normalizedRow);
  let merged = false;
  const nextRows = currentRows.map((item) => {
    if (makeVariantKey(item) !== key) return item;
    merged = true;
    const oldQty = Number(item.quantity || 0);
    const addQty = Number(normalizedRow.quantity || 0);
    const newQty = oldQty + addQty;
    const oldPrice = Number(item.pricePerUnit || 0);
    const addPrice = Number(normalizedRow.pricePerUnit || 0);
    return {
      ...item,
      ...normalizedRow,
      id: item.id || normalizedRow.id,
      quantity: newQty,
      pricePerUnit: newQty > 0 ? ((oldQty * oldPrice) + (addQty * addPrice)) / newQty : addPrice,
      barcode: item.barcode || normalizedRow.barcode,
    };
  });
  if (!merged) nextRows.unshift(normalizedRow);
  saveFinishedStockRows(nextRows);
  return nextRows;
}

export function readFinishedInventoryRows({ includeDefaults = false } = {}) {
  const storedFinishedRows = readFinishedStockRows().map(normalizeFinishedStockRow);
  const rows = [
    ...(includeDefaults ? defaultOwnProductionRows : []),
    ...storedFinishedRows,
  ];

  // Add local fallback rows only when the backend-derived finished-stock row is
  // not present yet. This keeps Outside Product purchases visible immediately,
  // but prevents double counting after the backend recalculates stock.
  const existingKeys = new Set(rows.map((row) => {
    const type = String(row.type || row.sourceType || "Own Production").trim().toLowerCase();
    const name = String(row.productName || row.product || row.name || "").trim().toLowerCase();
    const packet = String(row.packetSize || row.unit || "1kg").trim().toLowerCase();
    return `${type}::${name}::${packet}`;
  }));
  const addFallback = (row) => {
    const type = String(row.type || row.sourceType || "Own Production").trim().toLowerCase();
    const name = String(row.productName || row.product || row.name || "").trim().toLowerCase();
    const packet = String(row.packetSize || row.unit || "1kg").trim().toLowerCase();
    const key = `${type}::${name}::${packet}`;
    if (!name || existingKeys.has(key)) return;
    existingKeys.add(key);
    rows.push(row);
  };

  if (includeDefaults) defaultRepackRows.forEach(addFallback);
  mapRepackRows(readStoredArray(REPACK_PRODUCT_HISTORY_STORAGE_KEY)).forEach(addFallback);
  if (includeDefaults) defaultOutsideRows.forEach(addFallback);
  mapOutsideRows(readStoredArray(OUTSIDE_PRODUCT_STORAGE_KEY)).forEach(addFallback);
  mapOutsidePurchaseRows(readPurchases()).forEach(addFallback);

  return aggregateFinishedRows(applySoldQuantity(rows));
}
