import { readPurchases } from "./purchaseStore";

export const MATERIALS_MINIMUM_STOCK_STORAGE_KEY = "erp-materials-minimum-stock-v1";
export const FACTORY_ISSUE_STORAGE_KEY = "erp_factory_issue_history_v1";
export const REPACK_PRODUCT_STORAGE_KEY = "erp-repack-product-history";
export const OUTSIDE_PRODUCT_STORAGE_KEY = "erp-outside-products";

export const MATERIAL_PURCHASE_TYPES = {
  raw: "Raw Material",
  bought: "Bought Mix",
};

const defaultFactoryIssueHistory = [];

const defaultRepackHistory = [];

export function makeMaterialStockKey(name, unit = "kg") {
  return `${String(name || "").trim().toLowerCase()}::${String(unit || "kg").trim().toLowerCase()}`;
}

export function materialName(item) {
  return String(
    item?.name ||
      item?.materialName ||
      item?.product ||
      item?.productName ||
      item?.originalProduct ||
      ""
  ).trim();
}

export function materialUnit(item) {
  return String(item?.unit || "kg").trim() || "kg";
}

export function readStoredArray(key, fallback = []) {
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

function addQuantityByKey(map, name, unit, quantity) {
  const cleanName = String(name || "").trim();
  const cleanUnit = String(unit || "kg").trim() || "kg";
  const numericQuantity = Number(quantity || 0);
  if (!cleanName || numericQuantity <= 0) return;

  const stockKey = makeMaterialStockKey(cleanName, cleanUnit);
  map.set(stockKey, (map.get(stockKey) || 0) + numericQuantity);
}

export function aggregateMaterialUsage(kind) {
  const usageByStockKey = new Map();

  if (kind === "raw") {
    readStoredArray(FACTORY_ISSUE_STORAGE_KEY, []) .forEach((issue) => {
      (issue.materials || []).forEach((material) => {
        addQuantityByKey(
          usageByStockKey,
          materialName(material),
          materialUnit(material),
          material.quantity || material.qty
        );
      });
    });
  }

  if (kind === "bought") {
    readStoredArray(REPACK_PRODUCT_STORAGE_KEY, []) .forEach((item) => {
      addQuantityByKey(
        usageByStockKey,
        materialName(item),
        materialUnit(item),
        item.quantity || item.quantityKg
      );
    });
  }

  return usageByStockKey;
}

export function aggregateMaterialPurchases(purchases, purchaseType) {
  const summaryByStockKey = new Map();

  const sourceRows = purchases
    .filter((purchase) => Array.isArray(purchaseType) ? purchaseType.includes(purchase.type) : purchase.type === purchaseType);

  sourceRows
    .forEach((purchase) => {
      const name = String(purchase.product || "").trim();
      if (!name) return;

      const unit = String(purchase.unit || "kg").trim() || "kg";
      const stockKey = makeMaterialStockKey(name, unit);
      const current = summaryByStockKey.get(stockKey) || {
        stockKey,
        name,
        unit,
        purchasedQuantity: 0,
        purchaseValue: 0,
        suppliers: [],
      };
      const supplier = String(purchase.supplier || "").trim();

      current.purchasedQuantity += Number(purchase.quantity || 0);
      current.purchaseValue += Number(purchase.cost || 0);
      if (supplier && !current.suppliers.includes(supplier)) {
        current.suppliers.push(supplier);
      }

      summaryByStockKey.set(stockKey, current);
    });

  return summaryByStockKey;
}

export function buildMaterialStockSummary({
  kind = "raw",
  purchases = readPurchases(),
  minimumStocks = {},
} = {}) {
  const purchaseType = kind === "bought" ? "Bought Mix" : (MATERIAL_PURCHASE_TYPES[kind] || MATERIAL_PURCHASE_TYPES.raw);
  const purchaseSummary = aggregateMaterialPurchases(purchases, purchaseType);
  const usageByStockKey = aggregateMaterialUsage(kind);

  return Array.from(purchaseSummary.values())
    .map((item) => {
      const usedQuantity = usageByStockKey.get(item.stockKey) || 0;
      const currentStock = Math.max(Number(item.purchasedQuantity || 0) - usedQuantity, 0);
      const minimumStock = Number(minimumStocks[item.stockKey]?.minimumStock || 0);

      return {
        ...item,
        usedQuantity,
        currentStock,
        minimumStock,
        costPerUnit:
          Number(item.purchasedQuantity || 0) > 0
            ? Number(item.purchaseValue || 0) / Number(item.purchasedQuantity || 0)
            : 0,
        isLow: minimumStock > 0 && currentStock < minimumStock,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function readMinimumStocks() {
  if (typeof window === "undefined") return { raw: {}, bought: {} };

  try {
    const stored = window.localStorage.getItem(MATERIALS_MINIMUM_STOCK_STORAGE_KEY);
    if (!stored) return { raw: {}, bought: {} };

    const parsed = JSON.parse(stored);
    return {
      raw: parsed?.raw && typeof parsed.raw === "object" ? parsed.raw : {},
      bought: parsed?.bought && typeof parsed.bought === "object" ? parsed.bought : {},
    };
  } catch {
    return { raw: {}, bought: {} };
  }
}

export function saveMinimumStocks(nextMinimumStocks) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MATERIALS_MINIMUM_STOCK_STORAGE_KEY,
    JSON.stringify(nextMinimumStocks)
  );
}
