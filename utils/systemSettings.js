export const SYSTEM_SETTINGS_STORAGE_KEY = "erp-system-settings-v1";
export const SYSTEM_SETTINGS_UPDATED_EVENT = "erp-system-settings-updated";

export const DEFAULT_SYSTEM_SETTINGS = {
  company: {
    name: "Bakery ERP",
    contactNumber: "+880 1711-222333",
    address: "Dhaka, Bangladesh",
    email: "info@bakeryerp.com",
    currency: "BDT (\u09F3)",
  },
  units: ["kg", "gm", "ltr", "ml", "pcs"],
  packetSizes: [
    { label: "250g", kg: 0.25 },
    { label: "500g", kg: 0.5 },
    { label: "1kg", kg: 1 },
    { label: "5kg", kg: 5 },
    { label: "10kg", kg: 10 },
  ],
  productCategories: ["Cake Mix", "Bread Mix", "Cookie Mix", "Pancake Mix"],
  roles: {
    manager: ["Dashboard", "Suppliers", "Supplier Payment", "Purchase", "Materials", "Production", "Finished Stock", "Expenses", "Factory Issue", "Packaging", "Sales", "Customers", "Reports", "Accounts"],
    staff: ["Dashboard", "Sales", "Customers", "Finished Stock"],
    factorySupervisor: ["Dashboard", "Factory Issue", "Bulk Mix Stock", "Materials", "Production", "Packaging"],
    salesExecutive: ["Dashboard", "Customers", "Sales", "Finished Stock"],
  },
  notifications: {
    lowStockAlerts: true,
    productionCompletion: true,
    newSales: false,
    paymentDueReminders: true,
    email: "alerts@bakeryerp.com",
  },
};

function uniqueList(values, fallback = []) {
  const seen = new Set();
  const source = Array.isArray(values) && values.length > 0 ? values : fallback;

  return source
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeRolePermissions(values, fallback = []) {
  return uniqueList(values, fallback).map((permission) =>
    permission === "Raw Materials" || permission === "Materials Name" ? "Materials" : permission
  ).filter((permission, index, permissions) => permissions.indexOf(permission) === index);
}

export function packetLabelToKg(label) {
  const text = String(label || "").trim().toLowerCase().replace(/\s+/g, "");
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value) || value <= 0) return 1;

  if (text.endsWith("kg")) return value;
  if (text.endsWith("g") || text.endsWith("gm")) return value / 1000;
  return value;
}

export function makePacketSize(label) {
  const cleanLabel = String(label || "").trim();
  const kg = packetLabelToKg(cleanLabel);

  return {
    label: cleanLabel,
    kg,
    subtitle: `${kg.toLocaleString("en-US", { maximumFractionDigits: 3 })} kg per packet`,
  };
}

function normalizePacketSizes(packetSizes) {
  const source = Array.isArray(packetSizes) && packetSizes.length > 0
    ? packetSizes
    : DEFAULT_SYSTEM_SETTINGS.packetSizes;
  const labels = uniqueList(
    source.map((packet) => (typeof packet === "string" ? packet : packet?.label)),
    DEFAULT_SYSTEM_SETTINGS.packetSizes.map((packet) => packet.label)
  );

  return labels.map(makePacketSize);
}

export function normalizeSystemSettings(value = {}) {
  const settings = value && typeof value === "object" ? value : {};
  const storedRoles = settings.roles && typeof settings.roles === "object" ? settings.roles : {};

  return {
    company: {
      ...DEFAULT_SYSTEM_SETTINGS.company,
      ...(settings.company && typeof settings.company === "object" ? settings.company : {}),
    },
    units: uniqueList(settings.units, DEFAULT_SYSTEM_SETTINGS.units),
    packetSizes: normalizePacketSizes(settings.packetSizes),
    productCategories: uniqueList(settings.productCategories, DEFAULT_SYSTEM_SETTINGS.productCategories),
    roles: Object.fromEntries(
      Object.entries(DEFAULT_SYSTEM_SETTINGS.roles).map(([roleKey, fallbackPermissions]) => [
        roleKey,
        normalizeRolePermissions(storedRoles[roleKey], fallbackPermissions),
      ])
    ),
    notifications: {
      ...DEFAULT_SYSTEM_SETTINGS.notifications,
      ...(settings.notifications && typeof settings.notifications === "object" ? settings.notifications : {}),
    },
  };
}

export function readSystemSettings() {
  if (typeof window === "undefined") return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);

  try {
    const stored = window.localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
    if (!stored) return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);

    return normalizeSystemSettings(JSON.parse(stored));
  } catch {
    return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  }
}

export function saveSystemSettings(nextSettings) {
  const normalized = normalizeSystemSettings(nextSettings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(SYSTEM_SETTINGS_UPDATED_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function subscribeSystemSettings(listener) {
  if (typeof window === "undefined") return () => {};

  const notify = () => listener(readSystemSettings());
  const handleCustomEvent = (event) => listener(normalizeSystemSettings(event.detail));
  const handleStorage = (event) => {
    if (event.key === SYSTEM_SETTINGS_STORAGE_KEY) notify();
  };

  window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getPacketSizeOptions(settings = readSystemSettings()) {
  return normalizeSystemSettings(settings).packetSizes;
}

export function getDefaultPacketSize(settings = readSystemSettings()) {
  const packetSizes = getPacketSizeOptions(settings);
  return packetSizes.find((packet) => packet.label === "1kg") || packetSizes[0] || makePacketSize("1kg");
}
