export const SUPPLIERS_STORAGE_KEY = "erp-suppliers";
export const SUPPLIERS_UPDATED_EVENT = "erp-suppliers-updated";

export const supplierTypes = ["All Types", "Raw Material", "Mix Supplier", "Outside Product"];
export const formSupplierTypes = ["Raw Material Supplier", "Mix Supplier", "Outside Product"];

export const initialSuppliers = [];

export function normalizeSupplierType(type) {
  return type === "Raw Material Supplier" ? "Raw Material" : type || "Raw Material";
}

export function displaySupplierType(type) {
  return type === "Raw Material" ? "Raw Material Supplier" : type || "Raw Material Supplier";
}

export function supplierTypeToPurchaseType(type) {
  const normalizedType = normalizeSupplierType(type);
  if (normalizedType === "Mix Supplier") return "Bought Mix";
  if (normalizedType === "Outside Product") return "Outside Product";
  return "Raw Material";
}

export function normalizeSupplier(supplier = {}, index = 0) {
  const supplierName = supplier.supplierName || supplier.name || `Supplier ${index + 1}`;

  return {
    id: supplier.id || `SUP-${String(index + 1).padStart(3, "0")}`,
    supplierName,
    phone: supplier.phone || "",
    email: supplier.email || "",
    address: supplier.address || "",
    type: normalizeSupplierType(supplier.type),
    openingBalance: supplier.openingBalance ?? "0",
    status: supplier.status || "Active",
  };
}

export function readSuppliers() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(normalizeSupplier) : [];
  } catch {
    return [];
  }
}

export function saveSuppliers(suppliers) {
  const normalized = Array.isArray(suppliers)
    ? suppliers.map(normalizeSupplier)
    : [];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(SUPPLIERS_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function subscribeSuppliers(listener) {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(readSuppliers());
  const handleCustomEvent = (event) => {
    const suppliers = Array.isArray(event.detail)
      ? event.detail.map(normalizeSupplier)
      : readSuppliers();
    listener(suppliers);
  };
  const handleStorage = (event) => {
    if (event.key === SUPPLIERS_STORAGE_KEY) notify();
  };

  window.addEventListener(SUPPLIERS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(SUPPLIERS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}
