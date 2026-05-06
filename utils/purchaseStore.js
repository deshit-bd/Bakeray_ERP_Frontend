export const PURCHASE_STORAGE_KEY = "erp-simple-purchases";
export const PURCHASES_UPDATED_EVENT = "erp-simple-purchases-updated";

export const purchaseTypes = ["Raw Material", "Bought Mix", "Outside Product"];

export const defaultPurchases = [];

export const defaultOrders = defaultPurchases;

export function normalizePurchase(purchase = {}, index = 0) {
  return {
    id: purchase.id || `PUR-${String(index + 1).padStart(3, "0")}`,
    date: purchase.date || "",
    supplier: purchase.supplier || "",
    product: purchase.product || "",
    type: purchase.type || "",
    quantity: Number(purchase.quantity || 0),
    unit: purchase.unit || "kg",
    cost: Number(purchase.cost || 0),
    barcode: purchase.barcode || purchase.productBarcode || "",
    sellingPricePerUnit: Number(purchase.sellingPricePerUnit || purchase.sellingPrice || 0),
  };
}

export function readPurchases() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(PURCHASE_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(normalizePurchase);
  } catch {
    return [];
  }
}

export function savePurchases(purchases) {
  const normalized = Array.isArray(purchases)
    ? purchases.map(normalizePurchase)
    : [];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(PURCHASES_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function subscribePurchases(listener) {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(readPurchases());
  const handleCustomEvent = (event) => {
    const purchases = Array.isArray(event.detail)
      ? event.detail.map(normalizePurchase)
      : readPurchases();
    listener(purchases);
  };
  const handleStorage = (event) => {
    if (event.key === PURCHASE_STORAGE_KEY) notify();
  };

  window.addEventListener(PURCHASES_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener("focus", notify);

  return () => {
    window.removeEventListener(PURCHASES_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("focus", notify);
  };
}
