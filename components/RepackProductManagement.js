"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDefaultPacketSize,
  getPacketSizeOptions,
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";
import {
  defaultPurchases,
  readPurchases,
  subscribePurchases,
} from "../utils/purchaseStore";
import { buildMaterialStockSummary } from "../utils/materialStockStore";
import { addFinishedStockRow } from "../utils/finishedStockStore";
import { flushDbKey } from "../lib/apiSync";
import { resolveProductBarcode } from "../utils/barcode";

const STORAGE_KEY = "erp-repack-product-history";
const BDT_SYMBOL = "\u09F3";

const defaultHistory = [];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getPacketInfo(label, packetSizes) {
  return packetSizes.find((item) => item.label === label) ||
    packetSizes.find((item) => item.label === "1kg") ||
    packetSizes[0] ||
    { label: "1kg", kg: 1 };
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

function RepackIcon() {
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
      <path d="M17 2 21 6 17 10" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22 3 18 7 14" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function SelectMenu({ value, options, onChange, highlightSelected = true }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
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
        <span className="min-w-0 truncate">{value}</span>
        <ChevronIcon />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-[8px] bg-white p-[6px] shadow-[0_6px_18px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
        >
          {options.map((option) => {
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
                className={`flex h-[42px] w-full items-center justify-between rounded-[8px] px-3 text-left text-[18px] text-[#171717] transition ${
                  isSelected && highlightSelected ? "bg-[#e7e9ee]" : "hover:bg-[#f4f5f8]"
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

function historyProduct(item) {
  return item.originalProduct || item.product || item.productName || "";
}

function historySupplier(item) {
  return item.supplier || "";
}

function formatQuantity(value) {
  const numberValue = Number(value || 0);

  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString("en-US")
    : numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeHistoryRow(item, index, packetSizes) {
  const packetSize = item.packetSize || "1kg";
  const packetInfo = getPacketInfo(packetSize, packetSizes);
  const quantity = Number(item.quantity || item.quantityKg || 0);
  const packets =
    Number(item.packets || 0) ||
    (quantity > 0 && packetInfo.kg > 0 ? Math.floor(quantity / packetInfo.kg) : 0);

  return {
    id: item.id || `RP-${index + 1}`,
    date: item.date || "2026-04-27",
    originalProduct: historyProduct(item) || "",
    supplier: historySupplier(item),
    quantity,
    packetSize,
    packets,
    pricePerUnit: Number(item.pricePerUnit || item.sellingPrice || 0),
  };
}

function isLegacyDefaultHistory(items) {
  return (
    items.length === 1 &&
    items[0]?.id === "RP-001" &&
    items[0]?.originalProduct === "Supplier Cake Mix"
  );
}

function loadHistory(packetSizes) {
  if (typeof window === "undefined") return defaultHistory;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultHistory;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaultHistory;
    if (isLegacyDefaultHistory(parsed)) return defaultHistory;

    return parsed.map((item, index) => normalizeHistoryRow(item, index, packetSizes));
  } catch {
    return defaultHistory;
  }
}

function createEmptyForm(packetSize = "1kg") {
  return {
    productKey: "",
    productName: "",
    supplier: "",
    quantity: "",
    packetSize,
    sellingPrice: "",
  };
}

export default function RepackProductManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [purchases, setPurchases] = useState(defaultPurchases);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [history, setHistory] = useState(defaultHistory);
  const [form, setForm] = useState(() =>
    createEmptyForm(getDefaultPacketSize(readSystemSettings()).label)
  );
  const [formMessage, setFormMessage] = useState("");

  const packetSizes = useMemo(() => getPacketSizeOptions(settings), [settings]);
  const defaultPacket = useMemo(() => getDefaultPacketSize(settings), [settings]);
  const boughtStockOptions = useMemo(
    () =>
      buildMaterialStockSummary({ kind: "bought", purchases }).filter(
        (item) => Number(item.currentStock || 0) > 0
      ),
    [purchases, stockRefreshKey]
  );
  const selectedStock = useMemo(
    () => boughtStockOptions.find((item) => item.stockKey === form.productKey),
    [boughtStockOptions, form.productKey]
  );
  const supplierOptions = useMemo(
    () =>
      selectedStock?.suppliers && selectedStock.suppliers.length > 0
        ? selectedStock.suppliers
        : [],
    [selectedStock]
  );

  useEffect(() => {
    setHistory(loadHistory(packetSizes));
    setPurchases(readPurchases());
    setIsStorageReady(true);
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);
  useEffect(() => subscribePurchases(setPurchases), []);

  useEffect(() => {
    setForm((current) => {
      const currentStock = boughtStockOptions.find((item) => item.stockKey === current.productKey);
      const nextStock = currentStock || boughtStockOptions[0];

      if (!nextStock) {
        return { ...current, productKey: "", productName: "", supplier: "" };
      }

      const suppliers = nextStock.suppliers?.length ? nextStock.suppliers : [];

      return {
        ...current,
        productKey: nextStock.stockKey,
        productName: nextStock.name,
        supplier: suppliers.includes(current.supplier) ? current.supplier : suppliers[0],
      };
    });
  }, [boughtStockOptions]);

  useEffect(() => {
    if (!packetSizes.some((packet) => packet.label === form.packetSize)) {
      setForm((current) => ({ ...current, packetSize: defaultPacket.label }));
    }
  }, [defaultPacket.label, form.packetSize, packetSizes]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    setStockRefreshKey((current) => current + 1);
  }, [history, isStorageReady]);

  const packetInfo = useMemo(() => getPacketInfo(form.packetSize, packetSizes), [form.packetSize, packetSizes]);

  const totalPackets = useMemo(() => {
    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0 || !packetInfo.kg) return 0;

    return Math.floor(quantity / packetInfo.kg);
  }, [form.quantity, packetInfo]);

  const originalCostPerUnit = useMemo(() => Number(selectedStock?.costPerUnit || 0), [selectedStock]);

  const selectedBulkCost = useMemo(() => {
    const quantity = Number(form.quantity || 0);
    return quantity > 0 ? quantity * originalCostPerUnit : 0;
  }, [form.quantity, originalCostPerUnit]);

  const originalCostPerPacket = useMemo(() => {
    if (!totalPackets || totalPackets <= 0) return 0;
    return selectedBulkCost / totalPackets;
  }, [selectedBulkCost, totalPackets]);

  const estimatedProfitPerPacket = useMemo(() => {
    const sellingPrice = Number(form.sellingPrice || 0);
    return sellingPrice > 0 ? sellingPrice - originalCostPerPacket : 0;
  }, [form.sellingPrice, originalCostPerPacket]);

  const canSubmit =
    selectedStock &&
    form.supplier &&
    Number(form.quantity) > 0 &&
    Number(form.quantity) <= Number(selectedStock.currentStock || 0) &&
    Number(form.sellingPrice) > 0 &&
    totalPackets > 0;

  const updateField = (field, value) => {
    setForm((current) => {
      if (field !== "productKey") return { ...current, [field]: value };

      const nextStock = boughtStockOptions.find((item) => item.stockKey === value);
      const suppliers = nextStock?.suppliers?.length ? nextStock.suppliers : [];

      return {
        ...current,
        productKey: value,
        productName: nextStock?.name || "",
        supplier: suppliers[0] || "",
      };
    });
    setFormMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStock) {
      setFormMessage("Bought mix stock nai.");
      return;
    }

    if (Number(form.quantity) > Number(selectedStock.currentStock || 0)) {
      setFormMessage(
        `Stock a nai. ${selectedStock.name} available ${formatQuantity(selectedStock.currentStock)} ${selectedStock.unit}.`
      );
      return;
    }

    if (!canSubmit) return;

    const barcode = resolveProductBarcode({ productName: selectedStock.name, packetSize: form.packetSize, type: "Repack" });

    const nextRow = {
      id: `RP-${Date.now()}`,
      date: todayDate(),
      originalProduct: selectedStock.name,
      productName: selectedStock.name,
      product: selectedStock.name,
      supplier: form.supplier,
      quantity: Number(form.quantity),
      unit: selectedStock.unit,
      packetSize: form.packetSize,
      packets: totalPackets,
      outputPackets: totalPackets,
      pricePerUnit: Number(form.sellingPrice || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      sourceType: "Repack",
      barcode,
    };

    const finishedRow = {
      id: `FS-${nextRow.id}`,
      productName: selectedStock.name,
      type: "Repack",
      sourceType: "Repack",
      packetSize: form.packetSize,
      quantity: totalPackets,
      pricePerUnit: Number(form.sellingPrice || 0),
      sourceSupplier: form.supplier,
      sourceRepackId: nextRow.id,
      barcode,
    };

    const nextHistory = [nextRow, ...history];
    setHistory(nextHistory);
    // Update finished stock immediately so the Finished Stock route reflects the
    // repacked packets before the next DB re-hydration cycle. The backend still
    // recalculates and persists this same row from repack history.
    addFinishedStockRow(finishedRow);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
        window.dispatchEvent(new Event("erp-finished-stock-updated"));
      }
      await Promise.allSettled([
        flushDbKey(STORAGE_KEY),
        flushDbKey("erp_finished_stock_rows_v1"),
      ]);
    } catch {
      // Keep UI responsive; the DB sync status badge will surface API errors.
    }
    setStockRefreshKey((current) => current + 1);
    setForm(createEmptyForm(defaultPacket.label));
    setFormMessage("");
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
            Repack Product
          </h1>
          <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
            Convert purchased bulk mix into branded packets
          </p>
        </div>

        <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[20px] font-semibold text-[#171717]">
            Repack Bulk Purchase
          </h2>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="grid gap-x-5 gap-y-[18px] lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Purchased Product Name
                </span>
                <span className="relative block">
                  <select
                    value={form.productKey}
                    onChange={(event) => updateField("productKey", event.target.value)}
                    className="h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f0f0f3] px-4 pr-11 text-[17px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"
                  >
                    {boughtStockOptions.length === 0 ? (
                      <option value="">No bought mix stock</option>
                    ) : null}
                    {boughtStockOptions.map((stock) => (
                      <option key={stock.stockKey} value={stock.stockKey}>
                        {stock.name} ({formatQuantity(stock.currentStock)} {stock.unit})
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                    <ChevronIcon />
                  </span>
                </span>
              </label>

              <div className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Supplier
                </span>
                <SelectMenu
                  value={form.supplier}
                  options={supplierOptions}
                  onChange={(value) => updateField("supplier", value)}
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Bulk Quantity ({selectedStock?.unit || "kg"})
                </span>
                <input
                  type="number"
                  min="0"
                  max={selectedStock?.currentStock || undefined}
                  step="0.01"
                  value={form.quantity}
                  onChange={(event) => updateField("quantity", event.target.value)}
                  placeholder="Enter quantity"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[17px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Packet Size
                </span>
                <SelectMenu
                  value={form.packetSize}
                  options={packetSizes.map((packet) => packet.label)}
                  onChange={(value) => updateField("packetSize", value)}
                  highlightSelected={false}
                />
              </div>

              <div className="lg:col-span-2 rounded-[14px] border border-[#d9e2ef] bg-[#f8fafc] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[#64748b]">
                      Original packet cost
                    </p>
                    <p className="mt-1 text-[24px] font-bold text-[#111827]">
                      {BDT_SYMBOL}{formatCurrency(originalCostPerPacket)} / packet
                    </p>
                    <p className="mt-1 text-[14px] text-[#64748b]">
                      Based on purchase cost: {BDT_SYMBOL}{formatCurrency(originalCostPerUnit)} per {selectedStock?.unit || "kg"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-right sm:min-w-[260px]">
                    <div className="rounded-[12px] bg-white px-3 py-2">
                      <p className="text-[12px] font-semibold text-[#64748b]">Bulk Cost</p>
                      <p className="text-[17px] font-bold text-[#111827]">{BDT_SYMBOL}{formatCurrency(selectedBulkCost)}</p>
                    </div>
                    <div className="rounded-[12px] bg-white px-3 py-2">
                      <p className="text-[12px] font-semibold text-[#64748b]">Packets</p>
                      <p className="text-[17px] font-bold text-[#111827]">{totalPackets.toLocaleString("en-US")} pcs</p>
                    </div>
                  </div>
                </div>
                {Number(form.sellingPrice || 0) > 0 ? (
                  <p className={`mt-3 rounded-[10px] px-3 py-2 text-[14px] font-semibold ${estimatedProfitPerPacket >= 0 ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fee2e2] text-[#b91c1c]"}`}>
                    Estimated profit/loss per packet: {BDT_SYMBOL}{formatCurrency(estimatedProfitPerPacket)}
                  </p>
                ) : null}
              </div>

              <label className="block lg:col-span-2">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Selling Price per Packet ({BDT_SYMBOL})
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(event) => updateField("sellingPrice", event.target.value)}
                  placeholder="Enter selling price"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[17px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>
            </div>

            {formMessage ? (
              <p className="mt-4 rounded-[8px] bg-[#fff1f2] px-4 py-3 text-[15px] font-semibold text-[#be123c]">
                {formMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`mt-5 flex h-[45px] w-full items-center justify-center gap-5 rounded-[8px] bg-[#9d8df4] text-[16px] font-semibold text-white transition ${
                canSubmit ? "hover:bg-[#8c7bea]" : "cursor-not-allowed"
              }`}
            >
              <RepackIcon />
              <span>Repack Product</span>
            </button>
          </form>
        </article>

        <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[20px] font-semibold text-[#171717]">
            Repacking History
          </h2>

          <div className="mt-[42px] overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Date
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Product
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Supplier
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Bulk Qty
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Packet Size
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Total Packets
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                    Barcode
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-[17px] text-[18px] text-[#171717]">
                      {item.date}
                    </td>
                    <td className="px-3 py-[17px] text-[18px] font-semibold text-[#171717]">
                      {historyProduct(item)}
                    </td>
                    <td className="px-3 py-[17px] text-[18px] text-[#171717]">
                      {historySupplier(item)}
                    </td>
                    <td className="px-3 py-[17px] text-[18px] text-[#171717]">
                      {formatQuantity(item.quantity)} kg
                    </td>
                    <td className="px-3 py-[17px]">
                      <span className="inline-flex rounded-[5px] bg-[#efdfff] px-2.5 py-1 text-[16px] font-bold leading-none text-[#9333ea]">
                        {item.packetSize}
                      </span>
                    </td>
                    <td className="px-3 py-[17px] text-[18px] font-bold text-[#009b3f]">
                      {Number(item.packets || 0).toLocaleString("en-US")} pcs
                    </td>
                    <td className="px-3 py-[17px] font-mono text-[15px] text-[#171717]">
                      {item.barcode || resolveProductBarcode({ productName: historyProduct(item), packetSize: item.packetSize, type: "Repack" })}
                    </td>
                  </tr>
                ))}

                {history.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                      No repacking history found.
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
