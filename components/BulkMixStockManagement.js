"use client";

import { useEffect, useMemo, useState } from "react";
import { readBulkMixStockRows } from "../utils/bulkMixStockStore";

const BDT_SYMBOL = "\u09F3";

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 6.5C15.8 5.5 14.1 5 12.3 5 9.9 5 8 6.1 8 8s1.5 2.8 4.3 3.4C15.2 12 17 13 17 15s-2 4-5 4c-1.9 0-3.7-.6-5-1.8" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16 10 10l4 4 6-7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function SummaryCard({ title, value, subtitle, icon, iconClass }) {
  return (
    <article className="rounded-[16px] border border-[#e1e5ea] bg-white px-7 py-8 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[18px] font-bold text-[#4b5c78]">{title}</p>
        <span className={iconClass}>{icon}</span>
      </div>
      <p className="mt-12 text-[30px] font-extrabold leading-none text-[#08090d]">
        {value}
      </p>
      <p className="mt-3 text-[14px] text-[#4b5c78]">{subtitle}</p>
    </article>
  );
}

function formatMoney(value, decimals = 0) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatQuantity(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString("en-US")
    : numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function aggregateBulkMixRows(inputRows = []) {
  const grouped = new Map();

  inputRows.forEach((row, index) => {
    const mixName = normalizeText(row.mixName || row.productName || row.name);
    const quantityKg = Number(row.quantityKg || row.quantity || row.qty || 0);
    if (!mixName || quantityKg <= 0) return;

    const key = mixName.toLowerCase();
    const costPerKg = Number(row.costPerKg || row.cost_per_kg || 0);
    const current = grouped.get(key) || {
      ...row,
      id: `bulk-mix-${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || index + 1}`,
      mixName,
      batchNumber: row.batchNumber || row.batch_number || "",
      quantityKg: 0,
      costPerKg: 0,
      productionDate: row.productionDate || row.production_date || "",
      _totalValue: 0,
      _batchNumbers: new Set(),
      _dates: [],
    };

    current.quantityKg += quantityKg;
    current._totalValue += quantityKg * costPerKg;
    if (row.batchNumber || row.batch_number) current._batchNumbers.add(row.batchNumber || row.batch_number);
    if (row.productionDate || row.production_date) current._dates.push(row.productionDate || row.production_date);
    current.costPerKg = current.quantityKg > 0 ? current._totalValue / current.quantityKg : costPerKg;
    current.batchNumber = current._batchNumbers.size > 1 ? "Multiple Batches" : (Array.from(current._batchNumbers)[0] || current.batchNumber);
    current.productionDate = current._dates.sort().slice(-1)[0] || current.productionDate;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map(({ _totalValue, _batchNumbers, _dates, ...row }) => row);
}

export default function BulkMixStockManagement() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(aggregateBulkMixRows(readBulkMixStockRows()));
  }, []);

  const summary = useMemo(() => {
    const totalStock = rows.reduce((sum, row) => sum + Number(row.quantityKg || 0), 0);
    const totalValue = rows.reduce(
      (sum, row) => sum + Number(row.quantityKg || 0) * Number(row.costPerKg || 0),
      0
    );
    const avgCost = totalStock > 0 ? totalValue / totalStock : 0;
    const differentMixes = new Set(rows.map((row) => row.mixName)).size;

    return { totalStock, totalValue, avgCost, differentMixes };
  }, [rows]);

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
            Bulk Mix Stock
          </h1>
          <p className="mt-2 text-[20px] text-[#667085]">
            Unpackaged production inventory
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <SummaryCard
            title="Total Stock"
            value={`${formatQuantity(summary.totalStock)} kg`}
            subtitle={`${summary.differentMixes} different mixes`}
            icon={<LayersIcon />}
            iconClass="text-[#4f35f2]"
          />
          <SummaryCard
            title="Total Value"
            value={formatMoney(summary.totalValue)}
            subtitle="Unpackaged inventory"
            icon={<DollarIcon />}
            iconClass="text-[#00a846]"
          />
          <SummaryCard
            title="Avg Cost/kg"
            value={formatMoney(summary.avgCost, 2)}
            subtitle="Across all mixes"
            icon={<TrendIcon />}
            iconClass="text-[#f26a00]"
          />
        </div>

        <article className="mt-8 rounded-[16px] border border-[#e1e5ea] bg-white px-7 py-7 shadow-sm">
          <h2 className="text-[20px] font-bold text-[#171717]">
            Bulk Mix Inventory
          </h2>

          <div className="mt-9 overflow-x-auto">
            <table className="min-w-[920px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  {[
                    "Mix Name",
                    "Batch Number",
                    "Quantity (kg)",
                    "Cost/kg",
                    "Total Value",
                    "Production Date",
                  ].map((header) => (
                    <th
                      key={header}
                      className="border-b border-[#e5e7eb] px-3 py-3 text-[18px] font-bold text-[#171717]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[17px] font-bold text-[#171717]">
                      {row.mixName}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[15px] text-[#171717]">
                      <span className="inline-flex rounded-[5px] bg-[#f1f3f7] px-3 py-1.5 font-mono">
                        {row.batchNumber}
                      </span>
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[17px] font-bold text-[#171717]">
                      {formatQuantity(row.quantityKg)} kg
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] text-[#171717]">
                      {formatMoney(row.costPerKg)}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[17px] font-bold text-[#171717]">
                      {formatMoney(Number(row.quantityKg || 0) * Number(row.costPerKg || 0))}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] text-[#171717]">
                      {row.productionDate}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-10 text-center text-[15px] text-[#667085]">
                      No bulk mix stock found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
