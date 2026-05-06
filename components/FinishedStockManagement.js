"use client";

import { useEffect, useMemo, useState } from "react";
import { readFinishedInventoryRows } from "../utils/finishedStockStore";
import { subscribePurchases } from "../utils/purchaseStore";
import { resolveProductBarcode } from "../utils/barcode";

const REPACK_PRODUCT_HISTORY_STORAGE_KEY = "erp-repack-product-history";
const OUTSIDE_PRODUCT_STORAGE_KEY = "erp-outside-products";
const BDT_SYMBOL = "\u09F3";

const defaultOwnProductionRows = [];

const defaultRepackRows = [];

const defaultOutsideRows = [];

const filterOptions = ["All", "Own Production", "Repack", "Outside Product"];

export const ownProductionRows = defaultOwnProductionRows;
export const repackRows = defaultRepackRows;
export const outsideRows = defaultOutsideRows;

function loadStoredArray(key) {
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

function isRepackDemoRow(item) {
  return item.id === "RP-001" && item.originalProduct === "Bulk Pancake Mix";
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
    }));
}

function isOutsideDemoRow(item) {
  return (
    (item.id === "OP-001" && item.product === "Imported Cake Flour") ||
    (item.id === "OP-002" && item.product === "Premium Biscuits")
  );
}

function mapOutsideRows(products) {
  return products
    .filter((item) => !isOutsideDemoRow(item))
    .map((item) => ({
      id: `FS-${item.id}`,
      productName: item.product || item.productName || "",
      type: "Outside Product",
      packetSize: item.packetSize || "1kg",
      quantity: Number(item.quantity || 0),
      pricePerUnit: Number(item.sellingPricePerUnit || item.costPerUnit || 0),
    }));
}

function normalizeOwnProductionRow(item, index) {
  return {
    id: item.id || `FS-OWN-LOCAL-${index + 1}`,
    productName: item.productName || item.product || "",
    type: "Own Production",
    packetSize: item.packetSize || "1kg",
    quantity: Number(item.quantity || 0),
    pricePerUnit: Number(item.pricePerUnit || item.pricePerPacket || 0),
  };
}

function formatMoney(value) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US")}`;
}

function productTotal(row) {
  return Number(row.quantity || 0) * Number(row.pricePerUnit || 0);
}

function CubeIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 21v-9" />
      <path d="m8 5.25 8 4.5" />
    </svg>
  );
}

function RepackIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 2 21 6 17 10" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22 3 18 7 14" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function BagIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8h12l-1 13H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
      <path d="M9.5 13.5h5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#a4a9b5]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#51596a]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function TypeIcon({ type, className = "h-4 w-4" }) {
  if (type === "Repack") return <RepackIcon className={className} />;
  if (type === "Outside Product") return <BagIcon className={className} />;
  return <CubeIcon className={className} />;
}

function typePillClass(type) {
  if (type === "Repack") return "bg-[#f4e1ff] text-[#8a00e6]";
  if (type === "Outside Product") return "bg-[#ffe6d7] text-[#ea4b00]";
  return "bg-[#e5e8ff] text-[#3324ef]";
}

function SummaryCard({ title, count, type }) {
  const colorClass =
    type === "Repack"
      ? "text-[#a000ff]"
      : type === "Outside Product"
      ? "text-[#f04400]"
      : "text-[#5a34ff]";

  return (
    <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[18px] font-semibold text-[#4b5c78]">{title}</p>
        <span className={colorClass}>
          <TypeIcon type={type} className="h-5 w-5" />
        </span>
      </div>
      <p className={`mt-12 text-[30px] font-bold leading-none ${colorClass}`}>
        {Number(count || 0).toLocaleString("en-US")}
      </p>
      <p className="mt-3 text-[15px] text-[#4b5c78]">Product variants</p>
    </article>
  );
}

function FilterSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative w-full sm:w-[226px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[45px] w-full items-center justify-between rounded-[9px] bg-[#f0f0f3] px-4 text-left text-[18px] font-semibold text-[#171717] outline-none transition focus:ring-2 focus:ring-[#9d8df4]/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="text-[#8aa0bf]">
            <FilterIcon />
          </span>
          <span className="truncate">{value}</span>
        </span>
        <ChevronIcon />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 rounded-[8px] bg-white p-[6px] shadow-[0_6px_18px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
        >
          {filterOptions.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex h-[40px] w-full items-center justify-between rounded-[8px] px-3 text-left text-[18px] text-[#171717] transition ${
                  isSelected ? "bg-[#e7e9ee]" : "hover:bg-[#f4f5f8]"
                }`}
              >
                <span className="min-w-0 truncate">{option}</span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


function createLinearBarcodeSvg(code) {
  const value = String(code || "").trim();
  const chars = value || "000000000000";
  let x = 18;
  let bars = "";
  for (let i = 0; i < chars.length; i += 1) {
    const n = chars.charCodeAt(i);
    const widths = [2 + ((n + i) % 4), 1, 1 + ((n * 3 + i) % 3), 2, 1 + ((n + 7) % 2)];
    widths.forEach((width, idx) => {
      if (idx % 2 === 0) {
        bars += `<rect x="${x}" y="18" width="${width}" height="170" fill="#000"/>`;
      }
      x += width + 1;
    });
  }
  const viewWidth = Math.max(320, x + 18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewWidth}" height="210" viewBox="0 0 ${viewWidth} 210" preserveAspectRatio="none"><rect width="100%" height="100%" fill="#fff"/>${bars}</svg>`;
}

function BarcodeModal({ item, onClose }) {
  const barcodeValue = item ? item.barcode || resolveProductBarcode(item) : "";
  const svgMarkup = createLinearBarcodeSvg(barcodeValue);

  if (!item) return null;

  const labelTitle = `${item.productName || "Product"} - ${item.packetSize || ""}`.trim();

  const downloadBarcode = () => {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(labelTitle)}-barcode.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printBarcode = () => {
    const win = window.open("", "_blank", "width=620,height=360");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Barcode</title><style>html,body{margin:0;background:#fff}.page{min-height:100vh;display:flex;align-items:center;justify-content:center}.barcode{width:520px;height:210px;display:flex;align-items:center;justify-content:center}.barcode svg{width:100%;height:100%;display:block}@media print{body{margin:0}.page{min-height:auto}.barcode{width:90mm;height:36mm}}</style></head><body><div class="page"><div class="barcode">${svgMarkup}</div></div><script>window.onload=function(){window.print();};<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative w-full max-w-[620px] rounded-[8px] bg-[#111827] p-3 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-3 py-1 text-[22px] leading-none text-white hover:bg-black"
          aria-label="Close barcode modal"
        >
          ×
        </button>

        <div className="flex items-center justify-center bg-white p-2">
          <div className="h-[210px] w-full max-w-[560px]" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={printBarcode} className="rounded-[10px] bg-[#4f46e5] px-4 py-3 text-[15px] font-bold text-white hover:bg-[#4338ca]">Print</button>
          <button type="button" onClick={downloadBarcode} className="rounded-[10px] border border-[#cbd5e1] bg-white px-4 py-3 text-[15px] font-bold text-[#111827] hover:bg-[#f8fafc]">Download</button>
        </div>
      </div>
    </div>
  );
}

function escapeSvgText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtml(value) {
  return escapeSvgText(value).replace(/'/g, "&#39;");
}

function safeFileName(value) {
  return String(value || "product")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

function stripOuterSvg(svg) {
  const match = String(svg || "").match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  return match ? match[1] : svg;
}

export default function FinishedStockManagement() {
  const [sourceRows, setSourceRows] = useState({
    ownProduction: defaultOwnProductionRows,
    repack: defaultRepackRows,
    outside: defaultOutsideRows,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState(null);

  useEffect(() => {
    const refreshRows = () => {
      const inventoryRows = readFinishedInventoryRows({ includeDefaults: true });

      setSourceRows({
        ownProduction: inventoryRows.filter((row) => row.type === "Own Production"),
        repack: inventoryRows.filter((row) => row.type === "Repack"),
        outside: inventoryRows.filter((row) => row.type === "Outside Product"),
      });
    };

    refreshRows();

    const unsubscribePurchases = subscribePurchases(refreshRows);
    window.addEventListener("focus", refreshRows);
    window.addEventListener("storage", refreshRows);

    return () => {
      unsubscribePurchases();
      window.removeEventListener("focus", refreshRows);
      window.removeEventListener("storage", refreshRows);
    };
  }, []);

  const allRows = useMemo(
    () => [...sourceRows.ownProduction, ...sourceRows.repack, ...sourceRows.outside],
    [sourceRows]
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return allRows.filter((row) => {
      const totalValue = productTotal(row);
      const searchableText = [
        row.productName,
        row.type,
        row.packetSize,
        row.barcode,
        `${row.quantity} pcs`,
        row.quantity,
        row.pricePerUnit,
        formatMoney(row.pricePerUnit),
        totalValue,
        formatMoney(totalValue),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);
      const matchesType = typeFilter === "All" || row.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [allRows, searchTerm, typeFilter]);

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
            Finished Stock
          </h1>
          <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
            All packaged products ready for sale
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <SummaryCard
            title="Own Production"
            count={sourceRows.ownProduction.length}
            type="Own Production"
          />
          <SummaryCard title="Repack" count={sourceRows.repack.length} type="Repack" />
          <SummaryCard
            title="Outside"
            count={sourceRows.outside.length}
            type="Outside Product"
          />
        </div>

        <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <h2 className="text-[20px] font-semibold text-[#171717]">Product Inventory</h2>

            <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
              <label className="relative block w-full sm:w-[320px]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa0bf]">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by product, type, packet, qty, price..."
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] pl-[50px] pr-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <FilterSelect value={typeFilter} onChange={setTypeFilter} />
            </div>
          </div>

          <div className="mt-[38px] overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Product Name
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Type
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Packet Size
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Quantity
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Barcode
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Price ({BDT_SYMBOL})
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => {
                  const totalValue = productTotal(item);

                  return (
                    <tr key={item.id}>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px] text-[18px] font-semibold text-[#171717]">
                        {item.productName}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px]">
                        <span
                          className={`inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[16px] font-semibold leading-none ${typePillClass(
                            item.type
                          )}`}
                        >
                          <TypeIcon type={item.type} className="h-4 w-4" />
                          {item.type}
                        </span>
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px]">
                        <span className="inline-flex rounded-[5px] bg-[#f1f4f8] px-3 py-2 text-[16px] font-semibold leading-none text-[#171717]">
                          {item.packetSize}
                        </span>
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px] text-[18px] font-semibold text-[#171717]">
                        {Number(item.quantity || 0).toLocaleString("en-US")} pcs
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px]">
                        <button
                          type="button"
                          onClick={() => setSelectedBarcodeItem(item)}
                          className="rounded-[9px] bg-[#eef2ff] px-3 py-2 text-[14px] font-bold text-[#4f46e5] transition hover:bg-[#e0e7ff] focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
                        >
                          View Barcode
                        </button>
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px] text-[18px] text-[#171717]">
                        {formatMoney(item.pricePerUnit)}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[10px] text-[18px] font-bold text-[#009b3f]">
                        {formatMoney(totalValue)}
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                      No products match this search or filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
      <BarcodeModal item={selectedBarcodeItem} onClose={() => setSelectedBarcodeItem(null)} />
    </section>
  );
}
