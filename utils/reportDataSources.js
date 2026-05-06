const BDT_SYMBOL = "\u09F3";

const STORAGE_KEYS = {
  rawMaterials: "erp-raw-materials",
  mixProduction: "erp_mix_production_history_v1",
  packaging: "erp_packaging_history_rows_v1",
  invoices: "erp-invoice-rows",
  expenses: "erp-expense-history",
  purchases: "erp-simple-purchases",
  supplierPayments: "erp-supplier-payment-history",
  miscellaneous: "erp-miscellaneous-items",
  finishedStocks: "erp_finished_stock_rows_v1",
};

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const defaultRawMaterials = [];

const defaultProductionHistory = [];

const defaultPackagingHistory = [];

const defaultInvoices = [];

const defaultExpenses = [];

const defaultPurchases = [];

function readStoredArray(key, fallback, useStoredData) {
  if (!useStoredData || typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function safeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPlainNumber(value, options = {}) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    ...options,
  });
}

export function formatCurrency(value) {
  return `${BDT_SYMBOL}${Math.round(safeNumber(value)).toLocaleString("en-US")}`;
}

function getDateValue(row) {
  return row?.date || row?.invoiceDate || row?.productionDate || "";
}

function sortByDateDesc(rows) {
  return [...rows].sort((left, right) => String(getDateValue(right)).localeCompare(String(getDateValue(left))));
}

function getMonthKey(dateText) {
  const matched = String(dateText || "").match(/^(\d{4})-(\d{2})/);
  return matched ? `${matched[1]}-${matched[2]}` : null;
}

function monthIndexFromKey(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  return { year, month: month - 1 };
}

function shiftMonth(monthKey, offset) {
  const { year, month } = monthIndexFromKey(monthKey);
  const date = new Date(year, month + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthShortLabel(monthKey) {
  const { month } = monthIndexFromKey(monthKey);
  return monthLabels[month] || monthKey;
}

function getMonthFullLabel(monthKey) {
  const { year, month } = monthIndexFromKey(monthKey);
  return `${fullMonthLabels[month] || monthKey} ${year}`;
}

function getPeriodLabel(monthKeys) {
  if (!monthKeys.length) return "All time";
  const first = monthKeys[0];
  const last = monthKeys[monthKeys.length - 1];
  if (first === last) return getMonthFullLabel(first);
  const firstMeta = monthIndexFromKey(first);
  const lastMeta = monthIndexFromKey(last);
  if (firstMeta.year === lastMeta.year) {
    return `${getMonthShortLabel(first)} - ${getMonthShortLabel(last)} ${lastMeta.year}`;
  }
  return `${getMonthFullLabel(first)} - ${getMonthFullLabel(last)}`;
}

function getFourMonthWindow(monthKeys) {
  const latest = monthKeys.length > 0 ? [...monthKeys].sort().at(-1) : "2026-04";
  return [-3, -2, -1, 0].map((offset) => shiftMonth(latest, offset));
}

function aggregateRawMaterials(materials) {
  const groups = new Map();

  materials.forEach((material, index) => {
    const name = material.name || material.materialName || `Material ${index + 1}`;
    const unit = material.unit || "kg";
    const quantity = safeNumber(material.quantity ?? material.currentStock);
    const unitCost = safeNumber(material.costPerUnit ?? material.pricePerUnit ?? material.unitCost);
    const totalCost = safeNumber(material.totalCost || material.totalValue) || quantity * unitCost;
    const key = `${name}__${unit}`.toLowerCase();
    const current = groups.get(key) || {
      material: name,
      quantityUsed: 0,
      unit,
      totalCost: 0,
    };

    current.quantityUsed += quantity;
    current.totalCost += totalCost;
    groups.set(key, current);
  });

  return Array.from(groups.values());
}

function getProductionInputKg(record) {
  if (Array.isArray(record.materials)) {
    return record.materials.reduce((sum, material) => sum + safeNumber(material.quantity ?? material.qty), 0);
  }

  return safeNumber(record.inputKg ?? record.input ?? record.totalInput);
}

function getProductionMixName(record) {
  if (record.mixName) return record.mixName;
  if (record.productName) return record.productName;
  if (record.batchName) return String(record.batchName).replace(/\s*Batch\s*#?\d+$/i, "").trim();
  if (record.batchKey) return String(record.batchKey).replace(/-\d+$/, "").trim();
  return "Production Mix";
}

function getProductionBatch(record, index) {
  return record.batchNumber || record.batchKey || record.batchName || `BATCH-${String(index + 1).padStart(3, "0")}`;
}

function normalizeProductionRow(record, index) {
  const inputKg = getProductionInputKg(record);
  const outputKg = safeNumber(record.outputKg ?? record.quantityKg ?? record.output);
  const lossKg = record.lossKg !== undefined ? safeNumber(record.lossKg) : Math.max(inputKg - outputKg, 0);
  const efficiencyBase = inputKg || outputKg + lossKg;
  const efficiency = efficiencyBase > 0 ? (outputKg / efficiencyBase) * 100 : 0;

  return {
    id: record.id || `production-${index}`,
    date: record.date || record.productionDate || "",
    batch: getProductionBatch(record, index),
    mixName: getProductionMixName(record),
    inputKg,
    outputKg,
    lossKg,
    efficiency,
  };
}

function normalizePackagingRow(row, index) {
  return {
    id: row.id || `packaging-${index}`,
    date: row.date || row.productionDate || "",
    product: row.productName || row.mixName || row.product || "Packaged Product",
    packetSize: row.packetSize || row.size || "1kg",
    quantityPackaged: safeNumber(row.totalPackets ?? row.quantity ?? row.packetsMade),
  };
}

function normalizeInvoice(row, index) {
  const total = safeNumber(row.total || row.totalBill || row.amount || row.subtotal);
  const paid = safeNumber(row.paid ?? row.getAmount ?? row.receivedAmount);
  const due =
    row.balanceDue !== undefined || row.due !== undefined
      ? safeNumber(row.balanceDue ?? row.due)
      : Math.max(total - paid, 0);
  const invoiceNo = row.invoiceNo || row.id || `INV-${String(index + 1).padStart(3, "0")}`;

  return {
    id: invoiceNo,
    date: row.invoiceDate || row.date || "",
    invoice: invoiceNo,
    customer: row.customerName || row.companyName || row.customer || "Walk-in Customer",
    total,
    paid,
    due,
  };
}

function normalizeExpense(row, index) {
  return {
    id: row.id || `expense-${index}`,
    date: row.date || "",
    amount: safeNumber(row.amount),
  };
}

function normalizePurchase(row, index) {
  return {
    id: row.id || `purchase-${index}`,
    date: row.date || "",
    cost: safeNumber(row.cost ?? row.totalCost ?? row.amount),
  };
}

function getRawMaterialsReport(useStoredData) {
  const materials = readStoredArray(STORAGE_KEYS.rawMaterials, defaultRawMaterials, useStoredData);
  const rows = aggregateRawMaterials(materials);
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);

  return { rows, totalCost };
}

function getProductionReport(useStoredData) {
  const history = readStoredArray(STORAGE_KEYS.mixProduction, defaultProductionHistory, useStoredData);
  const rows = sortByDateDesc(history.map(normalizeProductionRow));
  return { rows };
}

function getPackagingReport(useStoredData) {
  const history = readStoredArray(STORAGE_KEYS.packaging, defaultPackagingHistory, useStoredData);
  const rows = sortByDateDesc(history.map(normalizePackagingRow));
  return { rows };
}

function getSalesReport(useStoredData) {
  const invoices = readStoredArray(STORAGE_KEYS.invoices, defaultInvoices, useStoredData);
  const rows = sortByDateDesc(invoices.map(normalizeInvoice));
  const totals = rows.reduce(
    (summary, row) => ({
      total: summary.total + row.total,
      paid: summary.paid + row.paid,
      due: summary.due + row.due,
    }),
    { total: 0, paid: 0, due: 0 }
  );

  return { rows, totals };
}

function getProfitLossReport(useStoredData) {
  const invoices = readStoredArray(STORAGE_KEYS.invoices, defaultInvoices, useStoredData).map(normalizeInvoice);
  const expenses = readStoredArray(STORAGE_KEYS.expenses, defaultExpenses, useStoredData).map(normalizeExpense);
  const purchases = readStoredArray(STORAGE_KEYS.purchases, defaultPurchases, useStoredData).map(normalizePurchase);
  const monthKeys = getFourMonthWindow(
    [
      ...invoices.map((row) => getMonthKey(row.date)),
      ...expenses.map((row) => getMonthKey(row.date)),
      ...purchases.map((row) => getMonthKey(row.date)),
    ].filter(Boolean)
  );

  const monthlyRows = monthKeys.map((monthKey) => {
    const revenue = invoices
      .filter((row) => getMonthKey(row.date) === monthKey)
      .reduce((sum, row) => sum + row.total, 0);
    const expenseAmount = expenses
      .filter((row) => getMonthKey(row.date) === monthKey)
      .reduce((sum, row) => sum + row.amount, 0);
    const purchaseCost = purchases
      .filter((row) => getMonthKey(row.date) === monthKey)
      .reduce((sum, row) => sum + row.cost, 0);
    const expense = expenseAmount + purchaseCost;

    return {
      monthKey,
      label: getMonthShortLabel(monthKey),
      revenue,
      expense,
      profit: revenue - expense,
    };
  });

  const summary = monthlyRows.reduce(
    (totals, row) => ({
      revenue: totals.revenue + row.revenue,
      expense: totals.expense + row.expense,
      profit: totals.profit + row.profit,
    }),
    { revenue: 0, expense: 0, profit: 0 }
  );

  return {
    summary,
    monthlyRows,
    periodLabel: getPeriodLabel(monthKeys),
  };
}

export function buildReportData(activeReportKey, options = {}) {
  const useStoredData = options.useStoredData !== false;

  switch (activeReportKey) {
    case "production":
      return getProductionReport(useStoredData);
    case "packaging":
      return getPackagingReport(useStoredData);
    case "sales":
      return getSalesReport(useStoredData);
    case "profit-loss":
      return getProfitLossReport(useStoredData);
    case "raw-materials":
    default:
      return getRawMaterialsReport(useStoredData);
  }
}
