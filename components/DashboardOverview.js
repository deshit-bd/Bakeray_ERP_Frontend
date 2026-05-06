"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EXPENSES_STORAGE_KEY,
  expenseRecords,
} from "./ExpenseManagement";
import {
  INVOICES_STORAGE_KEY,
  invoiceRows as defaultInvoiceRows,
} from "./SalesPosManagement";
import {
  RAW_MATERIALS_STORAGE_KEY,
  defaultMaterials,
} from "./RawMaterialsManagement";
import {
  RAW_PRODUCTION_STORAGE_KEY,
  initialRawMaterialProductionRows,
} from "./RawMaterialProductionPanel";
import {
  REPACKAGING_PRODUCTION_STORAGE_KEY,
  defaultRepackagingRows,
} from "./RepackingProductionPanel";
import {
  MIX_PRODUCTION_HISTORY_STORAGE_KEY,
  defaultMixProductionHistory,
} from "./MixProductionManagement";
import {
  INVENTORY_STORAGE_KEY,
  inventoryItems,
} from "./InventoryManagement";
import {
  outsideRows,
  ownProductionRows,
  repackRows,
} from "./FinishedStockManagement";
import {
  BULK_MIX_STOCK_STORAGE_KEY,
  deriveBulkMixStockRowsFromProduction,
} from "../utils/bulkMixStockStore";
import {
  FINISHED_STOCK_STORAGE_KEY,
  readFinishedInventoryRows,
} from "../utils/finishedStockStore";
import {
  defaultPurchases,
  PURCHASE_STORAGE_KEY,
} from "../utils/purchaseStore";

const BDT_SYMBOL = "\u09F3";
const REPACK_PRODUCT_HISTORY_STORAGE_KEY = "erp-repack-product-history";
const OUTSIDE_PRODUCT_STORAGE_KEY = "erp-outside-products";
const MATERIALS_MINIMUM_STOCK_STORAGE_KEY = "erp-materials-minimum-stock-v1";
const FACTORY_ISSUE_STORAGE_KEY = "erp_factory_issue_history_v1";
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const emptyDashboardData = {
  invoices: [],
  expenses: [],
  rawMaterials: [],
  rawProductionRows: [],
  repackagingRows: [],
  mixProductionRows: [],
  inventoryRows: [],
  bulkMixRows: [],
  finishedRows: [],
  purchases: [],
  factoryIssueRows: [],
  materialsMinimumStocks: { raw: {}, bought: {} },
};

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

function readStoredObject(key, fallback = {}) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function makeMaterialStockKey(name, unit) {
  return `${String(name || "").trim().toLowerCase()}::${String(unit || "kg").trim().toLowerCase()}`;
}

function stockNameFromKey(stockKey) {
  return String(stockKey || "").split("::")[0] || "Material";
}

function stockUnitFromKey(stockKey) {
  return String(stockKey || "").split("::")[1] || "kg";
}

function parseQuantity(value) {
  if (typeof value === "number") return value;
  const matched = String(value ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

function parseUnit(value, fallback = "") {
  const text = String(value ?? "").trim();
  const unit = text.replace(/[-\d.,\s]/g, "");
  return unit || fallback;
}

function formatNumber(value) {
  return Math.round(safeNumber(value)).toLocaleString("en-US");
}

function formatMoney(value) {
  return `${BDT_SYMBOL}${formatNumber(value)}`;
}

function formatQuantity(value, unit = "") {
  const formatted = formatNumber(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function getDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseDate(value) {
  if (!value) return null;
  const dateValue = String(value).slice(0, 10);
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  return getMonthKey(new Date(year, month - 1 + offset, 1));
}

function startOfWeek(date) {
  const copy = new Date(date);
  const dayOffset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dayOffset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizeInvoice(row, index) {
  const date = row.invoiceDate || row.date || getDateKey();
  const total = safeNumber(row.total || row.totalBill || row.amount);
  const paid = safeNumber(row.paid || row.receivedAmount || row.getAmount || total);
  const description = Array.isArray(row.description) ? row.description : [];

  return {
    id: row.id || row.invoiceNo || `INV-${index + 1}`,
    date,
    total,
    paid,
    items: safeNumber(row.items) || description.length || 1,
    description,
  };
}

function normalizeExpense(row, index) {
  return {
    id: row.id || `EXP-${index + 1}`,
    date: row.date || getDateKey(),
    amount: safeNumber(row.amount || row.total || row.cost),
  };
}

function normalizeRawMaterial(row, index) {
  return {
    id: row.id || `RM-${index + 1}`,
    name: row.name || row.materialName || `Material ${index + 1}`,
    quantity: safeNumber(row.quantity || row.currentStock),
    minStock: safeNumber(row.minStock || row.minimumStock),
    unit: row.unit || parseUnit(row.currentStock, "kg") || "kg",
  };
}

function mapRepackRows(history) {
  return history.map((item, index) => ({
    id: `FS-${item.id || index + 1}`,
    productName: item.originalProduct || item.product || item.productName || "Repack Product",
    type: "Repack",
    packetSize: item.packetSize || "1kg",
    quantity: safeNumber(item.packets || item.quantity),
    pricePerUnit: safeNumber(item.pricePerUnit || item.sellingPrice),
  }));
}

function mapOutsideRows(products) {
  return products.map((item, index) => ({
    id: `FS-${item.id || index + 1}`,
    productName: item.product || item.productName || "Outside Product",
    type: "Outside Product",
    packetSize: item.packetSize || "1kg",
    quantity: safeNumber(item.quantity),
    pricePerUnit: safeNumber(item.sellingPricePerUnit || item.costPerUnit),
  }));
}

function normalizeFinishedRow(row, index) {
  return {
    id: row.id || `FS-${index + 1}`,
    productName: row.productName || row.product || row.name || "Finished Product",
    type: row.type || "Finished Product",
    packetSize: row.packetSize || row.size || "1kg",
    quantity: safeNumber(row.quantity || row.stock || row.totalPackets),
    pricePerUnit: safeNumber(row.pricePerUnit || row.pricePerPacket || row.sellingPricePerUnit),
    minStock: row.minStock ?? row.minimumStock ?? row.minimumQuantity,
  };
}

function loadFinishedRows() {
  return readFinishedInventoryRows({ includeDefaults: true }).map(normalizeFinishedRow);
}

function loadDashboardData() {
  const mixProductionRows = readStoredArray(
    MIX_PRODUCTION_HISTORY_STORAGE_KEY,
    []
  );
  const storedBulkRows = readStoredArray(BULK_MIX_STOCK_STORAGE_KEY, []);

  return {
    invoices: readStoredArray(INVOICES_STORAGE_KEY, []).map(normalizeInvoice),
    expenses: readStoredArray(EXPENSES_STORAGE_KEY, []).map(normalizeExpense),
    rawMaterials: readStoredArray(RAW_MATERIALS_STORAGE_KEY, []).map(normalizeRawMaterial),
    rawProductionRows: readStoredArray(
      RAW_PRODUCTION_STORAGE_KEY,
      []
    ),
    repackagingRows: readStoredArray(
      REPACKAGING_PRODUCTION_STORAGE_KEY,
      []
    ),
    mixProductionRows,
    inventoryRows: readStoredArray(INVENTORY_STORAGE_KEY, []),
    bulkMixRows:
      storedBulkRows.length > 0
        ? storedBulkRows
        : deriveBulkMixStockRowsFromProduction(mixProductionRows),
    finishedRows: readStoredArray(FINISHED_STOCK_STORAGE_KEY, []).map(normalizeFinishedRow),
    purchases: readStoredArray(PURCHASE_STORAGE_KEY, defaultPurchases),
    factoryIssueRows: readStoredArray(FACTORY_ISSUE_STORAGE_KEY, []),
    materialsMinimumStocks: readStoredObject(MATERIALS_MINIMUM_STOCK_STORAGE_KEY, { raw: {}, bought: {} }),
  };
}

function isCompleted(status) {
  return String(status || "").toLowerCase() === "completed";
}

function getProductionDate(row) {
  return parseDate(row.date || row.productionDate || row.createdAt || row.updatedAt);
}

function getProductionQuantity(row) {
  if (row.outputKg !== undefined || row.quantityKg !== undefined) {
    return { value: safeNumber(row.outputKg || row.quantityKg), unit: "kg" };
  }

  if (row.productionQuantity || row.repackQuantity || row.quantity || row.afterQuantity) {
    const source = row.productionQuantity || row.repackQuantity || row.quantity || row.afterQuantity;
    return {
      value: parseQuantity(source),
      unit: parseUnit(source, row.repackQuantity ? "pcs" : "kg") || "kg",
    };
  }

  if (row.materialName) {
    const total = String(row.materialName)
      .split(" , ")
      .reduce((sum, segment) => {
        const amount = segment.split("/").slice(1).join("/");
        return sum + parseQuantity(amount);
      }, 0);

    return { value: total, unit: "kg" };
  }

  return { value: 0, unit: "kg" };
}

function invoiceQuantity(invoice) {
  if (Array.isArray(invoice.description) && invoice.description.length > 0) {
    return invoice.description.reduce((sum, item) => sum + safeNumber(item.quantity), 0);
  }

  return safeNumber(invoice.items);
}

function buildRawLowStock({ purchases, factoryIssueRows, materialsMinimumStocks }) {
  const purchasedByStockKey = new Map();
  const usedByStockKey = new Map();

  purchases
    .filter((purchase) => purchase.type === "Raw Material")
    .forEach((purchase) => {
      const stockKey = makeMaterialStockKey(purchase.product, purchase.unit || "kg");
      purchasedByStockKey.set(stockKey, (purchasedByStockKey.get(stockKey) || 0) + safeNumber(purchase.quantity));
    });

  factoryIssueRows.forEach((issue) => {
    (issue.materials || []).forEach((material) => {
      const stockKey = makeMaterialStockKey(material.name || material.materialName, material.unit || "kg");
      usedByStockKey.set(stockKey, (usedByStockKey.get(stockKey) || 0) + safeNumber(material.quantity || material.qty));
    });
  });

  return Object.entries(materialsMinimumStocks?.raw || {})
    .map(([stockKey, settings]) => {
      const minimum = safeNumber(settings?.minimumStock);
      const current = Math.max((purchasedByStockKey.get(stockKey) || 0) - (usedByStockKey.get(stockKey) || 0), 0);

      return {
        id: stockKey,
        name: settings?.name || stockNameFromKey(stockKey),
        current,
        minimum,
        unit: settings?.unit || stockUnitFromKey(stockKey),
      };
    })
    .filter((item) => item.minimum > 0 && item.current < item.minimum)
    .sort((a, b) => a.current / Math.max(a.minimum, 1) - b.current / Math.max(b.minimum, 1));
}

function buildFinishedLowStock(finishedRows) {
  return finishedRows
    .map((row) => {
      const current = safeNumber(row.quantity);
      return {
        id: row.id,
        name: `${row.productName}${row.packetSize ? ` (${row.packetSize})` : ""}`,
        current,
        minimum: 10,
        unit: "pcs",
        message: "Your finished stock less than 10",
      };
    })
    .filter((item) => item.current < 10)
    .sort((a, b) => a.current / Math.max(a.minimum, 1) - b.current / Math.max(b.minimum, 1));
}

function buildWeeklyDashboardSeries({ invoices, rawProductionRows, repackagingRows, mixProductionRows, currentDate }) {
  const weekStart = startOfWeek(currentDate);
  const dates = weekdayLabels.map((label, index) => ({
    label,
    date: addDays(weekStart, index),
    key: getDateKey(addDays(weekStart, index)),
  }));

  const productionRows = [
    ...rawProductionRows,
    ...repackagingRows,
    ...mixProductionRows,
  ].filter((row) => isCompleted(row.status));

  return dates.map((day) => {
    const dayInvoices = invoices.filter((invoice) => invoice.date === day.key);
    const dayProductionRows = productionRows.filter((row) => {
      const date = getProductionDate(row);
      return date ? getDateKey(date) === day.key : day.key === getDateKey(currentDate);
    });

    const productionKg = dayProductionRows.reduce((sum, row) => {
      const quantity = getProductionQuantity(row);
      return quantity.unit === "kg" ? sum + quantity.value : sum;
    }, 0);

    return {
      ...day,
      sales: dayInvoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0),
      salesQuantity: dayInvoices.reduce((sum, invoice) => sum + invoiceQuantity(invoice), 0),
      production: productionKg,
      productionBatches: dayProductionRows.length,
    };
  });
}

function buildDistribution({ rawMaterials, finishedRows, inventoryRows, bulkMixRows }) {
  const rawTotal = rawMaterials.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const finishedTotal = finishedRows.reduce((sum, row) => sum + safeNumber(row.quantity), 0);
  const bulkMixTotal = bulkMixRows.reduce((sum, row) => sum + safeNumber(row.quantityKg), 0);
  const inventoryTotal = inventoryRows.reduce((sum, row) => sum + parseQuantity(row.currentStock), 0);

  const slices = [
    { label: "Raw Materials", value: rawTotal, color: "#4f46e5" },
    { label: "Finished Products", value: finishedTotal, color: "#22c55e" },
    { label: "Bulk Mix", value: bulkMixTotal, color: "#f59e0b" },
    { label: "Inventory", value: inventoryTotal, color: "#ef4444" },
  ].filter((slice) => slice.value > 0);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cursor = 0;

  return slices.map((slice) => {
    const percent = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    const start = cursor;
    const end = cursor + (total > 0 ? (slice.value / total) * 360 : 0);
    cursor = end;
    return { ...slice, percent, start, end };
  });
}

function conicGradient(slices) {
  if (slices.length === 0) return "#e5e7eb";
  return `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}deg ${slice.end}deg`).join(", ")})`;
}

function monthlyChange(items, getValue, currentMonthKey) {
  const previousMonthKey = shiftMonth(currentMonthKey, -1);
  const current = items
    .filter((item) => item.date?.slice(0, 7) === currentMonthKey)
    .reduce((sum, item) => sum + getValue(item), 0);
  const previous = items
    .filter((item) => item.date?.slice(0, 7) === previousMonthKey)
    .reduce((sum, item) => sum + getValue(item), 0);

  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatChange(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% from last month`;
}

function buildSmoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function niceChartMax(value) {
  const maxValue = Math.max(value, 1);
  if (maxValue <= 100) return 100;
  const power = 10 ** Math.floor(Math.log10(maxValue));
  return Math.ceil(maxValue / power) * power;
}

function MoneyIcon() {
  return <span className="text-[24px] font-bold leading-none">{BDT_SYMBOL}</span>;
}

function ExpenseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 17 5-5 4 4 5-7" />
      <path d="M15 9h4v4" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4 21 20H3L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6h2l1.6 9.5h9.8L20 9H8" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 21v-9" />
    </svg>
  );
}

function StatCard({ title, value, subtitle, tone = "neutral", iconTone, subtitleTone, icon }) {
  const toneClasses = {
    neutral: "text-[#111111]",
    green: "text-[#00a542]",
    red: "text-[#e60012]",
    orange: "text-[#d96c00]",
    purple: "text-[#513cff]",
    muted: "text-[#465875]",
  };
  const valueClass = toneClasses[tone] || toneClasses.neutral;
  const iconClass = toneClasses[iconTone || tone] || toneClasses.neutral;
  const subtitleClass = toneClasses[subtitleTone || "muted"] || toneClasses.muted;

  return (
    <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[34px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[17px] font-semibold leading-6 text-[#485b78]">{title}</h2>
        <span className={iconClass}>{icon}</span>
      </div>
      <p className={`mt-12 text-[30px] font-bold leading-none ${valueClass}`}>{value}</p>
      <p className={`mt-3 text-[15px] leading-5 ${subtitleClass}`}>{subtitle}</p>
    </article>
  );
}

function SalesTrendChart({ series }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 470;
  const height = 285;
  const left = 64;
  const right = 430;
  const top = 34;
  const bottom = 220;
  const maxValue = niceChartMax(Math.max(...series.map((item) => item.value), 0));
  const ticks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
  const segmentWidth = (right - left) / Math.max(series.length - 1, 1);
  const points = series.map((item, index) => {
    const x = left + segmentWidth * index;
    const y = bottom - (safeNumber(item.value) / maxValue) * (bottom - top);
    return { x, y };
  });
  const linePath = buildSmoothPath(points);
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z` : "";
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const hoveredItem = hoveredIndex !== null ? series[hoveredIndex] : null;
  const tooltipX = hoveredPoint ? Math.min(Math.max(hoveredPoint.x + 12, 84), width - 160) : 0;
  const tooltipY = hoveredPoint ? Math.max(hoveredPoint.y + 18, 44) : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-6 h-auto w-full min-w-[420px]"
      role="img"
      aria-label="Sales trend chart"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <g stroke="#d7dbe4" strokeDasharray="4 4" strokeWidth="1">
        {ticks.map((tick) => {
          const y = bottom - (tick / maxValue) * (bottom - top);
          return <line key={`tick-${tick}`} x1={left} y1={y} x2={right} y2={y} />;
        })}
        {points.map((point, index) => (
          <line key={`grid-${index}`} x1={point.x} y1={top} x2={point.x} y2={bottom} />
        ))}
      </g>
      <g stroke="#8b8f99" strokeWidth="1">
        <line x1={left} y1={top} x2={left} y2={bottom} />
        <line x1={left} y1={bottom} x2={right} y2={bottom} />
      </g>
      <g fill="#6b6b6b" fontSize="17">
        {ticks.map((tick) => {
          const y = bottom - (tick / maxValue) * (bottom - top);
          return <text key={`label-${tick}`} x="12" y={y + 6}>{formatNumber(tick)}</text>;
        })}
        {series.map((item, index) => (
          <text key={item.label} x={points[index].x - 13} y="245">{item.label}</text>
        ))}
      </g>
      <path d={areaPath} fill="#4f46e5" opacity="0.18" className="dashboard-area-fade" />
      <path d={linePath} fill="none" stroke="#514cff" strokeWidth="2" strokeLinecap="round" pathLength="1" className="dashboard-line-draw" />
      {points.map((point, index) => (
        <g key={`sales-hover-${series[index].label}`}>
          <rect
            x={index === 0 ? left - 18 : point.x - segmentWidth / 2}
            y={top - 10}
            width={index === 0 || index === points.length - 1 ? segmentWidth / 2 + 24 : segmentWidth}
            height={bottom - top + 34}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(index)}
          />
          <circle
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === index ? 5 : 3.5}
            fill="#514cff"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="dashboard-point-pop"
          />
        </g>
      ))}
      {hoveredPoint && hoveredItem ? (
        <g pointerEvents="none">
          <line x1={hoveredPoint.x} y1={top} x2={hoveredPoint.x} y2={bottom} stroke="#a9adc0" strokeDasharray="3 4" />
          <rect x={tooltipX} y={tooltipY} width="128" height="78" fill="#ffffff" stroke="#d6d6d6" />
          <text x={tooltipX + 14} y={tooltipY + 28} fill="#000000" fontSize="18">{hoveredItem.label}</text>
          <text x={tooltipX + 14} y={tooltipY + 58} fill="#4f46e5" fontSize="16">Sales : {formatNumber(hoveredItem.value)}</text>
        </g>
      ) : null}
    </svg>
  );
}

function ProductionSalesChart({ series }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 470;
  const height = 285;
  const left = 64;
  const right = 430;
  const top = 34;
  const bottom = 220;
  const maxValue = niceChartMax(Math.max(...series.flatMap((item) => [item.production, item.salesQuantity]), 0));
  const ticks = [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
  const groupWidth = (right - left) / series.length;
  const hoveredItem = hoveredIndex !== null ? series[hoveredIndex] : null;
  const hoveredX = hoveredIndex !== null ? left + groupWidth * hoveredIndex + 12 : 0;
  const tooltipX = hoveredIndex !== null ? Math.min(Math.max(hoveredX - 8, 78), width - 190) : 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-6 h-auto w-full min-w-[420px]"
      role="img"
      aria-label="Production versus sales chart"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <g stroke="#d7dbe4" strokeDasharray="4 4" strokeWidth="1">
        {ticks.map((tick) => {
          const y = bottom - (tick / maxValue) * (bottom - top);
          return <line key={`tick-${tick}`} x1={left} y1={y} x2={right} y2={y} />;
        })}
        {series.map((item, index) => {
          const x = left + groupWidth * index + groupWidth / 2;
          return <line key={`grid-${item.label}`} x1={x} y1={top} x2={x} y2={bottom} />;
        })}
      </g>
      <g stroke="#8b8f99" strokeWidth="1">
        <line x1={left} y1={top} x2={left} y2={bottom} />
        <line x1={left} y1={bottom} x2={right} y2={bottom} />
      </g>
      <g fill="#6b6b6b" fontSize="17">
        {ticks.map((tick) => {
          const y = bottom - (tick / maxValue) * (bottom - top);
          return <text key={`label-${tick}`} x="12" y={y + 6}>{formatNumber(tick)}</text>;
        })}
      </g>
      {series.map((item, index) => {
        const x = left + groupWidth * index + 12;
        const productionHeight = (safeNumber(item.production) / maxValue) * (bottom - top);
        const salesHeight = (safeNumber(item.salesQuantity) / maxValue) * (bottom - top);

        return (
          <g key={item.label} onMouseEnter={() => setHoveredIndex(index)}>
            <rect x={x - 9} y={top - 8} width="72" height={bottom - top + 30} fill="transparent" />
            <rect x={x} y={bottom - productionHeight} width="26" height={productionHeight} fill="#22c55e" className="dashboard-bar-grow" />
            <rect x={x + 31} y={bottom - salesHeight} width="26" height={salesHeight} fill="#4f46e5" className="dashboard-bar-grow dashboard-bar-delay" />
            <text x={x + 11} y="245" fill="#6b6b6b" fontSize="17">{item.label}</text>
          </g>
        );
      })}
      {hoveredItem ? (
        <g pointerEvents="none">
          <rect x={tooltipX} y="46" width="174" height="102" fill="#ffffff" stroke="#d6d6d6" />
          <text x={tooltipX + 14} y="74" fill="#000000" fontSize="18">{hoveredItem.label}</text>
          <text x={tooltipX + 14} y="106" fill="#22c55e" fontSize="16">Production : {formatNumber(hoveredItem.production)}</text>
          <text x={tooltipX + 14} y="136" fill="#4f46e5" fontSize="16">Sales : {formatNumber(hoveredItem.salesQuantity)}</text>
        </g>
      ) : null}
    </svg>
  );
}

function DistributionChart({ slices }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const hoveredSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="mt-9 flex min-h-[245px] flex-col items-center justify-center gap-6">
      <div className="relative h-[190px] w-full">
        <svg
          viewBox="0 0 260 190"
          className="h-full w-full"
          role="img"
          aria-label="Stock distribution chart"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {slices.length === 0 ? (
            <circle cx="130" cy="92" r="74" fill="#e5e7eb" />
          ) : (
            slices.map((slice, index) => (
              <path
                key={slice.label}
                d={describeArc(130, 92, hoveredIndex === index ? 78 : 74, slice.start, slice.end)}
                fill={slice.color}
                stroke="#ffffff"
                strokeWidth="1.5"
                className="dashboard-pie-slice"
                onMouseEnter={() => setHoveredIndex(index)}
              />
            ))
          )}
          {hoveredSlice ? (
            <g pointerEvents="none">
              <rect x="44" y="46" width="172" height="52" fill="#ffffff" stroke="#d6d6d6" />
              <text x="58" y="78" fill="#000000" fontSize="18">{hoveredSlice.label} : {formatNumber(hoveredSlice.value)}</text>
            </g>
          ) : null}
        </svg>
      </div>
      <div className="grid w-full gap-2 text-[15px] sm:grid-cols-2">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="truncate text-[#465875]">{slice.label}</span>
            </span>
            <span className="font-semibold" style={{ color: slice.color }}>{slice.percent}%</span>
          </div>
        ))}
        {slices.length === 0 ? (
          <p className="col-span-full text-center text-[15px] text-[#64748b]">No stock data found.</p>
        ) : null}
      </div>
    </div>
  );
}

function LowStockList({ items, emptyText }) {
  return (
    <div className="mt-8 divide-y divide-[#e5e7eb]">
      {items.slice(0, 4).map((item) => (
        <div key={item.id || item.name} className="flex items-center justify-between gap-4 py-4 first:pt-0">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold text-[#171717]">{item.name}</p>
            <p className="mt-1 text-[14px] text-[#63718a]">
              {item.message || `Min: ${formatQuantity(item.minimum, item.unit)}`}
            </p>
          </div>
          <p className="shrink-0 text-[17px] font-bold text-[#ff0000]">{formatQuantity(item.current, item.unit)}</p>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[#64748b]">{emptyText}</p>
      ) : null}
    </div>
  );
}

export default function DashboardOverview() {
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);

  const refreshDashboard = useCallback(() => {
    setDashboardData(loadDashboardData());
  }, []);

  useEffect(() => {
    refreshDashboard();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshDashboard();
    };

    window.addEventListener("storage", refreshDashboard);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", refreshDashboard);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshDashboard]);

  const currentDate = useMemo(() => new Date(), []);

  const metrics = useMemo(() => {
    const {
      invoices,
      expenses,
      rawMaterials,
      rawProductionRows,
      repackagingRows,
      mixProductionRows,
      inventoryRows,
      bulkMixRows,
      finishedRows,
      purchases,
      factoryIssueRows,
      materialsMinimumStocks,
    } = dashboardData;

    const todayKey = getDateKey(currentDate);
    const monthKey = getMonthKey(currentDate);
    const rawLowStock = buildRawLowStock({ purchases, factoryIssueRows, materialsMinimumStocks });
    const finishedLowStock = buildFinishedLowStock(finishedRows);
    const weeklySeries = buildWeeklyDashboardSeries({
      invoices,
      rawProductionRows,
      repackagingRows,
      mixProductionRows,
      currentDate,
    });
    const todaySeries = weeklySeries.find((day) => day.key === todayKey) || {
      sales: 0,
      production: 0,
      productionBatches: 0,
    };
    const totalRevenue = invoices.reduce((sum, invoice) => sum + safeNumber(invoice.total), 0);
    const totalExpense = expenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
    const profitLoss = totalRevenue - totalExpense;
    const revenueChange = monthlyChange(invoices, (invoice) => safeNumber(invoice.total), monthKey);
    const expenseChange = monthlyChange(expenses, (expense) => safeNumber(expense.amount), monthKey);
    const profitChange = revenueChange - expenseChange;

    return {
      totalRevenue,
      totalExpense,
      profitLoss,
      revenueChange,
      expenseChange,
      profitChange,
      rawLowStock,
      finishedLowStock,
      stockAlertCount: rawLowStock.length + finishedLowStock.length,
      todaySales: todaySeries.sales,
      todayOrderCount: invoices.filter((invoice) => invoice.date === todayKey).length,
      todayProduction: todaySeries.production,
      todayProductionBatches: todaySeries.productionBatches,
      weeklySeries,
      distribution: buildDistribution({ rawMaterials, finishedRows, inventoryRows, bulkMixRows }),
    };
  }, [currentDate, dashboardData]);

  const statCards = [
    {
      title: "Total Revenue",
      value: formatMoney(metrics.totalRevenue),
      subtitle: formatChange(metrics.revenueChange),
      tone: "neutral",
      iconTone: "green",
      subtitleTone: "green",
      icon: <MoneyIcon />,
    },
    {
      title: "Total Expense",
      value: formatMoney(metrics.totalExpense),
      subtitle: formatChange(metrics.expenseChange),
      tone: "neutral",
      iconTone: "red",
      subtitleTone: "red",
      icon: <ExpenseIcon />,
    },
    {
      title: "Profit/Loss",
      value: formatMoney(metrics.profitLoss),
      subtitle: formatChange(metrics.profitChange),
      tone: metrics.profitLoss >= 0 ? "green" : "red",
      iconTone: metrics.profitLoss >= 0 ? "green" : "red",
      subtitleTone: metrics.profitLoss >= 0 ? "green" : "red",
      icon: <MoneyIcon />,
    },
    {
      title: "Stock Alert",
      value: `${formatNumber(metrics.stockAlertCount)} Items`,
      subtitle: "Require attention",
      tone: "orange",
      iconTone: "orange",
      icon: <WarningIcon />,
    },
    {
      title: "Today Sales",
      value: formatMoney(metrics.todaySales),
      subtitle: `${formatNumber(metrics.todayOrderCount)} orders`,
      tone: "neutral",
      iconTone: "purple",
      subtitleTone: "purple",
      icon: <CartIcon />,
    },
    {
      title: "Today Production",
      value: `${formatNumber(metrics.todayProduction)} kg`,
      subtitle: `${formatNumber(metrics.todayProductionBatches)} batches completed`,
      tone: "neutral",
      iconTone: "purple",
      subtitleTone: "purple",
      icon: <BoxIcon />,
    },
  ];

  return (
    <section className="min-w-0 flex-1 bg-[#f8fafc] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold leading-tight text-[#0f172a]">Dashboard</h1>
          <p className="mt-2 text-[20px] leading-6 text-[#64748b]">Overview of your bakery operations</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        <div className="mt-[30px] grid gap-[30px] xl:grid-cols-2">
          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Sales Trend</h2>
            <div className="overflow-x-auto">
              <SalesTrendChart
                series={metrics.weeklySeries.map((item) => ({
                  label: item.label,
                  value: item.sales,
                }))}
              />
            </div>
          </article>

          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Production vs Sales</h2>
            <div className="overflow-x-auto">
              <ProductionSalesChart series={metrics.weeklySeries.slice(0, 5)} />
            </div>
          </article>
        </div>

        <div className="mt-[30px] grid gap-[30px] lg:grid-cols-3">
          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Stock Distribution</h2>
            <DistributionChart slices={metrics.distribution} />
          </article>

          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3">
              <span className="text-[#f97316]"><WarningIcon /></span>
              <h2 className="text-[20px] font-semibold leading-6 text-[#171717]">Low Stock - Raw Materials</h2>
            </div>
            <LowStockList items={metrics.rawLowStock} emptyText="Raw materials are above minimum stock." />
          </article>

          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3">
              <span className="text-[#f97316]"><WarningIcon /></span>
              <h2 className="text-[20px] font-semibold leading-6 text-[#171717]">Low Stock - Finished Products</h2>
            </div>
            <LowStockList items={metrics.finishedLowStock} emptyText="Finished products are above minimum stock." />
          </article>
        </div>
      </div>
    </section>
  );
}
