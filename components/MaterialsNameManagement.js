"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultPurchases,
  readPurchases,
  savePurchases,
  subscribePurchases,
} from "../utils/purchaseStore";

const BDT_SYMBOL = "\u09F3";
const MINIMUM_STOCK_STORAGE_KEY = "erp-materials-minimum-stock-v1";
const FACTORY_ISSUE_STORAGE_KEY = "erp_factory_issue_history_v1";
const REPACK_PRODUCT_STORAGE_KEY = "erp-repack-product-history";
const FINISHED_STOCK_STORAGE_KEY = "erp_finished_stock_rows_v1";
const OUTSIDE_PRODUCT_STORAGE_KEY = "erp-outside-products";

const tabs = [
  { key: "raw", label: "Raw Materials", type: "Raw Material" },
  { key: "bought", label: "Bought Mix", type: "Bought Mix" },
];

const defaultFactoryIssueHistory = [];

const defaultRepackHistory = [];

function formatTaka(amount) {
  return (
    <>
      <span className="currency-symbol">{BDT_SYMBOL}</span>
      {Number(amount || 0).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      })}
    </>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function readStoredArray(key, fallback) {
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

function saveStoredArray(key, rows) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []));
}

function readMinimumStocks() {
  if (typeof window === "undefined") return { raw: {}, bought: {} };

  try {
    const stored = window.localStorage.getItem(MINIMUM_STOCK_STORAGE_KEY);
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

function saveMinimumStocks(nextMinimumStocks) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(MINIMUM_STOCK_STORAGE_KEY, JSON.stringify(nextMinimumStocks));
}

function makeStockKey(name, unit) {
  return `${String(name || "").trim().toLowerCase()}::${String(unit || "kg").trim().toLowerCase()}`;
}

function roundStockNumber(value) {
  const numericValue = Number(value || 0);
  return Number(Number.isFinite(numericValue) ? numericValue.toFixed(6) : 0);
}

function itemName(item) {
  return String(item?.name || item?.materialName || item?.product || item?.productName || item?.originalProduct || "").trim();
}

function itemUnit(item) {
  return String(item?.unit || "kg").trim() || "kg";
}

function formatQuantity(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString("en-US")
    : numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function compareDates(leftDate, rightDate) {
  const leftTime = Date.parse(leftDate || "");
  const rightTime = Date.parse(rightDate || "");

  if (!Number.isFinite(leftTime)) return -1;
  if (!Number.isFinite(rightTime)) return 1;
  return leftTime - rightTime;
}

function aggregateStockRows(purchases, purchaseType) {
  const rowsByProduct = new Map();

  const sourceRows = purchases
    .filter((purchase) => Array.isArray(purchaseType) ? purchaseType.includes(purchase.type) : purchase.type === purchaseType);

  sourceRows
    .forEach((purchase) => {
      const productName = String(purchase.product || "").trim();
      if (!productName) return;

      const unit = String(purchase.unit || "kg").trim() || "kg";
      const purchaseDate = purchase.date || "-";
      const stockKey = makeStockKey(productName, unit);
      const current = rowsByProduct.get(stockKey) || {
        id: stockKey,
        stockKey,
        name: productName,
        unit,
        purchasedQuantity: 0,
        totalValue: 0,
        purchaseCount: 0,
        lastPurchaseDate: purchaseDate,
      };

      current.purchasedQuantity += Number(purchase.quantity || 0);
      current.totalValue += Number(purchase.cost || 0);
      current.purchaseCount += 1;

      if (compareDates(purchaseDate, current.lastPurchaseDate) > 0) {
        current.lastPurchaseDate = purchaseDate;
      }

      rowsByProduct.set(stockKey, current);
    });

  return Array.from(rowsByProduct.values())
    .map((row) => ({
      ...row,
      costPerUnit: row.purchasedQuantity > 0 ? row.totalValue / row.purchasedQuantity : 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function aggregateUsageByStockKey(activeTab) {
  const usageByStockKey = new Map();

  const addUsage = (name, unit, quantity) => {
    const cleanName = String(name || "").trim();
    const cleanUnit = String(unit || "kg").trim() || "kg";
    const numericQuantity = Number(quantity || 0);
    if (!cleanName || numericQuantity <= 0) return;

    const key = makeStockKey(cleanName, cleanUnit);
    usageByStockKey.set(key, (usageByStockKey.get(key) || 0) + numericQuantity);
  };

  if (activeTab === "raw") {
    readStoredArray(FACTORY_ISSUE_STORAGE_KEY, []) .forEach((issue) => {
      (issue.materials || []).forEach((material) => {
        addUsage(itemName(material), itemUnit(material), material.quantity || material.qty);
      });
    });
  }

  if (activeTab === "bought") {
    readStoredArray(REPACK_PRODUCT_STORAGE_KEY, []) .forEach((item) => {
      addUsage(itemName(item), itemUnit(item), item.quantity || item.quantityKg);
    });
  }

  return usageByStockKey;
}

function buildStockSummary(rows, minimumStocksByKey, usageByStockKey) {
  return rows
    .map((row) => {
      const usedQuantity = usageByStockKey.get(row.stockKey) || 0;
      const currentStock = Math.max(Number(row.purchasedQuantity || 0) - usedQuantity, 0);
      const minimumStock = Number(minimumStocksByKey[row.stockKey]?.minimumStock || 0);

      return {
        ...row,
        usedQuantity,
        currentStock,
        minimumStock,
        isLow: minimumStock > 0 && currentStock < minimumStock,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function createEditStockForm(row) {
  return {
    name: row.name || "",
    unit: row.unit || "kg",
    currentStock: String(row.currentStock ?? 0),
    minimumStock: String(row.minimumStock ?? 0),
    costPerUnit: String(row.costPerUnit ?? 0),
  };
}

function purchaseMatchesStock(purchase, purchaseType, stockKey) {
  return purchase.type === purchaseType && makeStockKey(purchase.product, purchase.unit || "kg") === stockKey;
}

function updatePurchasesForStockEdit(purchases, row, purchaseType, form) {
  const nextName = String(form.name || "").trim();
  const nextUnit = String(form.unit || "kg").trim() || "kg";
  const nextCurrentStock = Math.max(Number(form.currentStock || 0), 0);
  const nextCostPerUnit = Math.max(Number(form.costPerUnit || 0), 0);
  const nextPurchasedQuantity = roundStockNumber(nextCurrentStock + Number(row.usedQuantity || 0));
  const matchingPurchases = purchases.filter((purchase) => purchaseMatchesStock(purchase, purchaseType, row.stockKey));
  const matchCount = matchingPurchases.length;
  const oldPurchasedQuantity = matchingPurchases.reduce((sum, purchase) => sum + Number(purchase.quantity || 0), 0);
  let remainingQuantity = nextPurchasedQuantity;

  return purchases.map((purchase) => {
    if (!purchaseMatchesStock(purchase, purchaseType, row.stockKey)) return purchase;

    const matchIndex = matchingPurchases.findIndex((item) => String(item.id) === String(purchase.id));
    const isLastMatch = matchIndex === matchCount - 1;
    const share = oldPurchasedQuantity > 0
      ? Number(purchase.quantity || 0) / oldPurchasedQuantity
      : 1 / Math.max(matchCount, 1);
    const nextQuantity = isLastMatch
      ? roundStockNumber(remainingQuantity)
      : roundStockNumber(nextPurchasedQuantity * share);

    remainingQuantity = roundStockNumber(remainingQuantity - nextQuantity);

    return {
      ...purchase,
      product: nextName,
      unit: nextUnit,
      quantity: nextQuantity,
      unitPrice: nextCostPerUnit,
      cost: roundStockNumber(nextQuantity * nextCostPerUnit),
    };
  });
}

function updateRawUsageReferences(row, form) {
  const nextName = String(form.name || "").trim();
  const nextUnit = String(form.unit || "kg").trim() || "kg";
  const nextStockKey = makeStockKey(nextName, nextUnit);
  const history = readStoredArray(FACTORY_ISSUE_STORAGE_KEY, []);
  let changed = false;
  const changedIssues = [];

  const nextHistory = history.map((issue) => {
    let issueChanged = false;
    const nextIssue = {
      ...issue,
      materials: Array.isArray(issue.materials)
        ? issue.materials.map((material) => {
          const materialStockKey = material.stockKey || makeStockKey(itemName(material), itemUnit(material));
          if (materialStockKey !== row.stockKey) return material;

          changed = true;
          issueChanged = true;
          return {
            ...material,
            name: nextName,
            materialName: nextName,
            unit: nextUnit,
            stockKey: nextStockKey,
          };
        })
        : issue.materials,
    };

    if (issueChanged) changedIssues.push(nextIssue);
    return nextIssue;
  });

  if (changed) saveStoredArray(FACTORY_ISSUE_STORAGE_KEY, nextHistory);
  return changedIssues;
}

function syncFactoryIssuesToDb() {
  return;
}

function updateBoughtUsageReferences(row, form) {
  const nextName = String(form.name || "").trim();
  const nextUnit = String(form.unit || "kg").trim() || "kg";
  const history = readStoredArray(REPACK_PRODUCT_STORAGE_KEY, []);
  let historyChanged = false;

  const nextHistory = history.map((item) => {
    const stockKey = makeStockKey(itemName(item), itemUnit(item));
    if (stockKey !== row.stockKey) return item;

    historyChanged = true;
    return {
      ...item,
      originalProduct: nextName,
      product: nextName,
      productName: nextName,
      unit: nextUnit,
    };
  });

  if (historyChanged) saveStoredArray(REPACK_PRODUCT_STORAGE_KEY, nextHistory);

  const finishedRows = readStoredArray(FINISHED_STOCK_STORAGE_KEY, []);
  let finishedChanged = false;
  const nextFinishedRows = finishedRows.map((item) => {
    const rowType = String(item.type || item.sourceType || "").trim();
    const stockKey = makeStockKey(item.productName || item.product || item.name, nextUnit);
    const nameMatches = makeStockKey(item.productName || item.product || item.name, row.unit) === row.stockKey;

    if (rowType !== "Repack" || (!nameMatches && stockKey !== row.stockKey)) return item;

    finishedChanged = true;
    return {
      ...item,
      productName: nextName,
      product: item.product ? nextName : item.product,
      name: item.name ? nextName : item.name,
    };
  });

  if (finishedChanged) saveStoredArray(FINISHED_STOCK_STORAGE_KEY, nextFinishedRows);
}

function FormInput({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[16px] font-semibold text-[#344054]">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`h-[45px] w-full rounded-[8px] border border-[#d9dee7] px-3 text-[16px] text-[#111827] outline-none focus:border-[#523cf0] ${readOnly ? "bg-[#f3f4f6] font-semibold" : "bg-white"}`}
      />
    </label>
  );
}

function MinimumStockPanel({
  minimumStockValue,
  onMinimumStockValueChange,
  onSelectedStockKeyChange,
  onSetMinimumStock,
  selectedStockKey,
  stockOptions,
}) {
  return (
    <div className="mt-7 max-w-[720px] rounded-[12px] border border-[#e1e5ea] bg-[#fbfcff] p-5">
      <h3 className="text-[18px] font-semibold text-[#171717]">Minimum Stock</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_170px] md:items-end">
        <label className="block">
          <span className="mb-2 block text-[15px] font-semibold text-[#475467]">Material Name</span>
          <select
            value={selectedStockKey}
            onChange={(event) => onSelectedStockKeyChange(event.target.value)}
            className="h-[44px] w-full rounded-[8px] border border-[#d9dee7] bg-white px-3 text-[15px] font-semibold text-[#111827] outline-none focus:border-[#523cf0]"
          >
            {stockOptions.length === 0 ? (
              <option value="">No material found</option>
            ) : null}
            {stockOptions.map((option) => (
              <option key={option.stockKey} value={option.stockKey}>
                {option.name} ({option.unit})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[15px] font-semibold text-[#475467]">Minimum Stock</span>
          <input
            type="number"
            min="0"
            value={minimumStockValue}
            onChange={(event) => onMinimumStockValueChange(event.target.value)}
            placeholder="0"
            className="h-[44px] w-full rounded-[8px] border border-[#d9dee7] bg-white px-3 text-[15px] text-[#111827] outline-none focus:border-[#523cf0]"
          />
        </label>

        <button
          type="button"
          onClick={onSetMinimumStock}
          disabled={!selectedStockKey}
          className="h-[44px] rounded-[8px] bg-[#523cf0] px-5 text-[15px] font-semibold text-white transition hover:bg-[#4632df] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Set Minimum Stock
        </button>
      </div>
    </div>
  );
}

function MaterialStockTable({ rows, activeTab, onEdit }) {
  return (
    <div className="mt-10 overflow-x-auto">
      <table className="min-w-[1080px] w-full border-separate border-spacing-0">
        <thead>
          <tr className="border-b border-[#e5e7eb] text-left">
            <th className="border-b border-[#e5e7eb] px-10 py-3 text-[18px] font-semibold text-[#18181b]">Name</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Current Stock</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Min Stock</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Purchased Qty</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Used Qty</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Unit</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Cost/Unit</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Total Value</th>
            <th className="border-b border-[#e5e7eb] px-7 py-3 text-right text-[18px] font-semibold text-[#18181b]">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${activeTab}-${row.stockKey}`}
              className={`${index % 2 === 1 ? "bg-[#f7f7f9]" : "bg-white"} border-b border-[#e5e7eb] last:border-b-0`}
            >
              <td className="px-10 py-4 text-[17px] font-semibold text-[#18181b]">{row.name}</td>
              <td className={`px-7 py-4 text-[16px] font-bold ${row.isLow ? "bg-[#fee2e2] text-[#b42318]" : "text-[#18181b]"}`}>
                <div>{formatQuantity(row.currentStock)}</div>
                {row.isLow ? <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">Low Stock</div> : null}
              </td>
              <td className={`px-7 py-4 text-[16px] ${row.isLow ? "bg-[#fff1f2] font-bold text-[#b42318]" : "text-[#18181b]"}`}>{formatQuantity(row.minimumStock)}</td>
              <td className="px-7 py-4 text-[16px] text-[#18181b]">{formatQuantity(row.purchasedQuantity)}</td>
              <td className="px-7 py-4 text-[16px] text-[#18181b]">{formatQuantity(row.usedQuantity)}</td>
              <td className="px-7 py-4 text-[16px] text-[#18181b]">{row.unit}</td>
              <td className="px-7 py-4 text-[16px] text-[#18181b]">{formatTaka(row.costPerUnit)}</td>
              <td className="px-7 py-4 text-[16px] font-semibold text-[#18181b]">{formatTaka(row.totalValue)}</td>
              <td className="px-7 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[#111827] transition hover:bg-[#eef2ff] hover:text-[#4f35f2]"
                  aria-label={`Edit ${row.name}`}
                  title={`Edit ${row.name}`}
                >
                  <EditIcon />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan="9" className="px-7 py-10 text-center text-[16px] text-[#667085]">
                No purchase stock found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function MaterialsNameManagement() {
  const [activeTab, setActiveTab] = useState("raw");
  const [purchases, setPurchases] = useState(defaultPurchases);
  const [minimumStocks, setMinimumStocks] = useState(() => readMinimumStocks());
  const [minimumStockValue, setMinimumStockValue] = useState("");
  const [selectedStockKey, setSelectedStockKey] = useState("");
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [editingStock, setEditingStock] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setPurchases(readPurchases());
    return subscribePurchases(setPurchases);
  }, []);

  useEffect(() => {
    const refreshStockUsage = () => setStockRefreshKey((current) => current + 1);
    window.addEventListener("focus", refreshStockUsage);
    window.addEventListener("storage", refreshStockUsage);

    return () => {
      window.removeEventListener("focus", refreshStockUsage);
      window.removeEventListener("storage", refreshStockUsage);
    };
  }, []);

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const activeMinimumStocks = useMemo(
    () => minimumStocks[activeTab] || {},
    [activeTab, minimumStocks]
  );
  const rows = useMemo(
    () => aggregateStockRows(purchases, activeTabConfig.key === "bought" ? "Bought Mix" : activeTabConfig.type),
    [activeTabConfig.type, purchases]
  );
  const usageByStockKey = useMemo(
    () => aggregateUsageByStockKey(activeTab),
    [activeTab, stockRefreshKey]
  );
  const stockSummary = useMemo(
    () => buildStockSummary(rows, activeMinimumStocks, usageByStockKey),
    [activeMinimumStocks, rows, usageByStockKey]
  );
  const totalQuantity = useMemo(
    () => stockSummary.reduce((sum, row) => sum + Number(row.currentStock || 0), 0),
    [stockSummary]
  );
  const totalValue = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.totalValue || 0), 0),
    [rows]
  );
  const selectedStock = useMemo(
    () => stockSummary.find((item) => item.stockKey === selectedStockKey),
    [selectedStockKey, stockSummary]
  );

  useEffect(() => {
    setSelectedStockKey((current) => {
      if (stockSummary.some((item) => item.stockKey === current)) return current;
      return stockSummary[0]?.stockKey || "";
    });
  }, [activeTab, stockSummary]);

  useEffect(() => {
    if (!selectedStockKey) {
      setMinimumStockValue("");
      return;
    }

    const savedMinimumStock = activeMinimumStocks[selectedStockKey]?.minimumStock;
    setMinimumStockValue(savedMinimumStock === undefined ? "" : String(savedMinimumStock));
  }, [activeMinimumStocks, selectedStockKey]);

  const setMinimumStock = () => {
    if (!selectedStock) return;

    const nextMinimumStock = Number(minimumStockValue || 0);
    if (!Number.isFinite(nextMinimumStock) || nextMinimumStock < 0) return;

    setMinimumStocks((current) => {
      const nextMinimumStocks = {
        ...current,
        [activeTab]: {
          ...(current[activeTab] || {}),
          [selectedStock.stockKey]: {
            name: selectedStock.name,
            unit: selectedStock.unit,
            minimumStock: nextMinimumStock,
          },
        },
      };

      saveMinimumStocks(nextMinimumStocks);
      return nextMinimumStocks;
    });
  };

  const openEditModal = (row) => {
    setEditingStock(row);
    setEditForm(createEditStockForm(row));
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingStock(null);
    setEditForm(null);
    setEditError("");
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    setEditError("");
  };

  const saveStockEdit = (event) => {
    event.preventDefault();
    if (!editingStock || !editForm) return;

    const nextName = String(editForm.name || "").trim();
    const nextUnit = String(editForm.unit || "kg").trim() || "kg";
    const nextCurrentStock = Number(editForm.currentStock || 0);
    const nextMinimumStock = Number(editForm.minimumStock || 0);
    const nextCostPerUnit = Number(editForm.costPerUnit || 0);

    if (!nextName) {
      setEditError("Name required.");
      return;
    }

    if ([nextCurrentStock, nextMinimumStock, nextCostPerUnit].some((value) => !Number.isFinite(value) || value < 0)) {
      setEditError("Number fields must be 0 or more.");
      return;
    }

    const nextStockKey = makeStockKey(nextName, nextUnit);
    const purchaseType = activeTabConfig.key === "bought" ? "Bought Mix" : activeTabConfig.type;
    const nextPurchases = updatePurchasesForStockEdit(purchases, editingStock, purchaseType, {
      ...editForm,
      name: nextName,
      unit: nextUnit,
    });
    const savedPurchases = savePurchases(nextPurchases);

    setPurchases(savedPurchases);
    setMinimumStocks((current) => {
      const nextActiveStocks = { ...(current[activeTab] || {}) };
      delete nextActiveStocks[editingStock.stockKey];
      nextActiveStocks[nextStockKey] = {
        name: nextName,
        unit: nextUnit,
        minimumStock: nextMinimumStock,
      };

      const nextMinimumStocks = {
        ...current,
        [activeTab]: nextActiveStocks,
      };

      saveMinimumStocks(nextMinimumStocks);
      return nextMinimumStocks;
    });

    if (activeTab === "raw") {
      const changedIssues = updateRawUsageReferences(editingStock, { ...editForm, name: nextName, unit: nextUnit });
      syncFactoryIssuesToDb(changedIssues);
    } else {
      updateBoughtUsageReferences(editingStock, { ...editForm, name: nextName, unit: nextUnit });
    }

    setSelectedStockKey(nextStockKey);
    setMinimumStockValue(String(nextMinimumStock));
    setStockRefreshKey((current) => current + 1);
    closeEditModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-5 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">Materials</h1>
              <p className="mt-2 text-[19px] text-[#64748b]">
                Purchase-driven stock for raw materials and bought mix
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-2 gap-2 rounded-[12px] bg-[#e7e7eb] p-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={[
                      "h-10 rounded-[9px] px-3 text-[15px] font-semibold transition",
                      active ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.10)]" : "text-[#526174] hover:bg-white/55",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <article className="mt-9 overflow-hidden rounded-[17px] border border-[#dddddf] bg-white">
            <div className="px-8 pb-8 pt-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-[20px] font-semibold text-[#171717]">
                    {activeTabConfig.label} Inventory
                  </h2>
                  <p className="mt-2 text-[15px] text-[#64748b]">
                    Data is calculated from Purchase entries.
                  </p>
                </div>

                <div className="grid gap-3 text-right sm:grid-cols-2">
                  <div>
                    <p className="text-[13px] font-semibold uppercase text-[#64748b]">Total Stock</p>
                    <p className="mt-1 text-[20px] font-bold text-[#111827]">{formatQuantity(totalQuantity)}</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold uppercase text-[#64748b]">Total Value</p>
                    <p className="mt-1 text-[20px] font-bold text-[#111827]">{formatTaka(totalValue)}</p>
                  </div>
                </div>
              </div>

              <MinimumStockPanel
                minimumStockValue={minimumStockValue}
                onMinimumStockValueChange={setMinimumStockValue}
                onSelectedStockKeyChange={setSelectedStockKey}
                onSetMinimumStock={setMinimumStock}
                selectedStockKey={selectedStockKey}
                stockOptions={stockSummary}
              />

              <MaterialStockTable rows={stockSummary} activeTab={activeTab} onEdit={openEditModal} />
            </div>
          </article>
        </div>
      </section>

      {editingStock && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white px-8 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold text-[#171717]">Edit {activeTabConfig.label}</h2>
                <p className="mt-2 text-[18px] text-[#74788d]">{editingStock.name}</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#4b5563] transition hover:bg-[#f3f4f6]"
                aria-label="Close edit stock modal"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={saveStockEdit} className="mt-6 space-y-5">
              <FormInput
                label="Name"
                value={editForm.name}
                onChange={(event) => updateEditField("name", event.target.value)}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormInput
                  label="Current Stock"
                  type="number"
                  value={editForm.currentStock}
                  onChange={(event) => updateEditField("currentStock", event.target.value)}
                />
                <FormInput
                  label="Used Qty"
                  type="number"
                  value={String(editingStock.usedQuantity ?? 0)}
                  readOnly
                  onChange={() => {}}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormInput
                  label="Minimum Stock"
                  type="number"
                  value={editForm.minimumStock}
                  onChange={(event) => updateEditField("minimumStock", event.target.value)}
                />
                <FormInput
                  label="Unit"
                  value={editForm.unit}
                  onChange={(event) => updateEditField("unit", event.target.value)}
                />
              </div>

              <FormInput
                label="Cost/Unit"
                type="number"
                value={editForm.costPerUnit}
                onChange={(event) => updateEditField("costPerUnit", event.target.value)}
              />

              {editError ? (
                <p className="rounded-[8px] bg-[#fff1f2] px-4 py-3 text-[15px] font-semibold text-[#be123c]">
                  {editError}
                </p>
              ) : null}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-[45px] rounded-[8px] border border-[#d9dee7] bg-white px-5 text-[16px] font-semibold text-[#111827] transition hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-[45px] rounded-[8px] bg-[#523cf0] px-5 text-[16px] font-semibold text-white transition hover:bg-[#4632df]"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
