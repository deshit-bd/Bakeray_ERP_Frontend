export const BULK_MIX_STOCK_STORAGE_KEY = "erp_bulk_mix_stock_rows_v1";
export const DEFAULT_BULK_MIX_COST_PER_KG = 90;
const MIX_PRODUCTION_HISTORY_STORAGE_KEY = "erp_mix_production_history_v1";

export const defaultBulkMixStockRows = [];

function normalizeMixName(value) {
  return String(value || "").trim();
}

function aggregateBulkMixRows(rows) {
  const grouped = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const mixName = normalizeMixName(row.mixName || row.productName || row.name);
    if (!mixName) continue;
    const key = mixName.toLowerCase();
    const quantityKg = Number(row.quantityKg || row.quantity || row.availableKg || 0);
    if (quantityKg <= 0) continue;
    const costPerKg = Number(row.costPerKg || 0);
    const current = grouped.get(key) || {
      ...row,
      id: `bulk-mix-${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || grouped.size + 1}`,
      mixName,
      batchNumber: "",
      quantityKg: 0,
      costPerKg: 0,
      productionDate: row.productionDate || row.date || "",
      _totalValue: 0,
      _batches: new Set(),
      _dates: [],
    };

    current.quantityKg += quantityKg;
    current._totalValue += quantityKg * costPerKg;
    current.costPerKg = current.quantityKg > 0 ? current._totalValue / current.quantityKg : costPerKg;
    if (row.batchNumber || row.batchName) current._batches.add(row.batchNumber || row.batchName);
    if (row.productionDate || row.date) current._dates.push(row.productionDate || row.date);
    current.batchNumber = current._batches.size > 1 ? "Multiple Batches" : (Array.from(current._batches)[0] || current.batchNumber || row.batchNumber || row.batchName || "");
    current.productionDate = current._dates.sort().slice(-1)[0] || current.productionDate || "";
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map(({ _totalValue, _batches, _dates, ...row }) => row);
}

function readStoredArray(key, fallback = []) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readStoredArrayIfPresent(key) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return null;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getMixNameFromProduction(record) {
  if (record.mixName) return record.mixName;
  if (record.batchKey) return String(record.batchKey).replace(/-\d+$/, "").trim();
  if (record.batchName) return String(record.batchName).replace(/\s*Batch\s*#?\d+$/i, "").trim();
  return "Bulk Mix";
}

function getBatchNumber(record, index) {
  return record.batchKey || record.batchNumber || `BATCH-${String(index + 1).padStart(3, "0")}`;
}

export function deriveBulkMixStockRowsFromProduction(history) {
  return history
    .filter((record) => String(record.status || "").toLowerCase() === "completed")
    .filter((record) => Number(record.outputKg || record.quantityKg || 0) > 0)
    .map((record, index) => ({
      id: `bulk-mix-${record.id || index + 1}`,
      productionId: record.id,
      sourceRoute: "mix-production",
      mixName: getMixNameFromProduction(record),
      batchNumber: getBatchNumber(record, index),
      quantityKg: Number(record.outputKg || record.quantityKg || 0),
      costPerKg: Number(record.costPerKg || DEFAULT_BULK_MIX_COST_PER_KG),
      productionDate: record.date || record.productionDate || "",
    }));
}

export function readBulkMixStockRows() {
  if (typeof window === "undefined") return defaultBulkMixStockRows;

  const storedRows = readStoredArrayIfPresent(BULK_MIX_STOCK_STORAGE_KEY);
  if (storedRows) {
    const aggregated = aggregateBulkMixRows(storedRows);
    if (aggregated.length !== storedRows.length) saveBulkMixStockRows(aggregated);
    return aggregated;
  }

  const productionHistory = readStoredArray(MIX_PRODUCTION_HISTORY_STORAGE_KEY, []);
  const derivedRows = aggregateBulkMixRows(deriveBulkMixStockRowsFromProduction(productionHistory));
  if (derivedRows.length > 0) saveBulkMixStockRows(derivedRows);
  return derivedRows;
}

export function saveBulkMixStockRows(rows) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(BULK_MIX_STOCK_STORAGE_KEY, JSON.stringify(aggregateBulkMixRows(rows)));
  } catch {
    // Ignore localStorage write issues.
  }
}

export function addBulkMixStockRow(row) {
  const currentRows = readBulkMixStockRows();
  const nextRows = aggregateBulkMixRows([{ ...row, sourceRoute: "mix-production" }, ...currentRows]);

  saveBulkMixStockRows(nextRows);
  return nextRows;
}

export function updateBulkMixStockQuantity(rowId, nextQuantityKg) {
  const nextRows = readBulkMixStockRows()
    .map((row) =>
      row.id === rowId
        ? { ...row, quantityKg: Math.max(Number(nextQuantityKg || 0), 0) }
        : row
    )
    .filter((row) => Number(row.quantityKg || 0) > 0);

  saveBulkMixStockRows(nextRows);
  return nextRows;
}
