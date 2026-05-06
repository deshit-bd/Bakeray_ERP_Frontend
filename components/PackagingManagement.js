"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readBulkMixStockRows,
  updateBulkMixStockQuantity,
} from "../utils/bulkMixStockStore";
import { addFinishedStockRow } from "../utils/finishedStockStore";
import {
  getDefaultPacketSize,
  getPacketSizeOptions,
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";
import { resolveProductBarcode } from "../utils/barcode";

export const PACKAGING_HISTORY_STORAGE_KEY = "erp_packaging_history_rows_v1";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="M5 7l7 4 7-4" />
      <path d="M12 21V11" />
    </svg>
  );
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function readStoredArray(key) {
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

function saveStoredArray(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage write issues.
  }
}

function formatKg(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString("en-US")
    : numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function PackagingManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [stockRows, setStockRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState("");
  const [bulkQty, setBulkQty] = useState("");
  const [pricePerPacket, setPricePerPacket] = useState("");
  const [selectedPacketLabel, setSelectedPacketLabel] = useState(() =>
    getDefaultPacketSize(readSystemSettings()).label
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const packetSizes = useMemo(() => getPacketSizeOptions(settings), [settings]);
  const defaultPacket = useMemo(() => getDefaultPacketSize(settings), [settings]);
  const selectedPacket = useMemo(
    () => packetSizes.find((packet) => packet.label === selectedPacketLabel) || defaultPacket,
    [defaultPacket, packetSizes, selectedPacketLabel]
  );

  useEffect(() => {
    setStockRows(readBulkMixStockRows());
    setHistory(readStoredArray(PACKAGING_HISTORY_STORAGE_KEY));
    setIsStorageReady(true);
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);

  useEffect(() => {
    if (!packetSizes.some((packet) => packet.label === selectedPacketLabel)) {
      setSelectedPacketLabel(defaultPacket.label);
    }
  }, [defaultPacket.label, packetSizes, selectedPacketLabel]);

  useEffect(() => {
    if (!isStorageReady) return;
    saveStoredArray(PACKAGING_HISTORY_STORAGE_KEY, history);
  }, [history, isStorageReady]);

  const selectedStock = useMemo(
    () => stockRows.find((row) => row.id === selectedStockId),
    [selectedStockId, stockRows]
  );

  const selectedCostPerKg = Number(selectedStock?.costPerKg || selectedStock?.unitCost || selectedStock?.cost || 0);

  const estimatedBulkCost = useMemo(() => {
    const qty = Number(bulkQty || 0);
    if (!selectedCostPerKg || !qty) return 0;
    return Number((qty * selectedCostPerKg).toFixed(2));
  }, [bulkQty, selectedCostPerKg]);

  const totalPackets = useMemo(() => {
    const qty = Number(bulkQty);
    if (!qty || qty <= 0 || !selectedPacket?.kg) return 0;
    return Math.floor(qty / selectedPacket.kg);
  }, [bulkQty, selectedPacket]);

  const consumedKg = useMemo(
    () => Number((totalPackets * Number(selectedPacket?.kg || 0)).toFixed(2)),
    [selectedPacket, totalPackets]
  );

  const estimatedConsumedCost = useMemo(() => {
    if (!selectedCostPerKg || !consumedKg) return 0;
    return Number((consumedKg * selectedCostPerKg).toFixed(2));
  }, [consumedKg, selectedCostPerKg]);

  const estimatedCostPerPacket = useMemo(() => {
    if (!totalPackets || !estimatedConsumedCost) return 0;
    return Number((estimatedConsumedCost / totalPackets).toFixed(2));
  }, [estimatedConsumedCost, totalPackets]);

  const canPack =
    Boolean(selectedStock) &&
    Number(bulkQty) > 0 &&
    Number(pricePerPacket) > 0 &&
    totalPackets > 0 &&
    consumedKg <= Number(selectedStock?.quantityKg || 0);

  const selectStock = (stockId) => {
    setSelectedStockId(stockId);
    setBulkQty("");
    setIsDropdownOpen(false);
  };

  const handlePackNow = () => {
    if (!canPack) return;

    const nextStockQty = Number(selectedStock.quantityKg || 0) - consumedKg;
    const nextStockRows = updateBulkMixStockQuantity(selectedStock.id, nextStockQty);
    const date = todayDate();
    const barcode = resolveProductBarcode({ productName: selectedStock.mixName, packetSize: selectedPacket.label, type: "Own Production" });

    const historyRow = {
      id: `PKG-${Date.now()}`,
      date,
      mixName: selectedStock.mixName,
      stockId: selectedStock.id,
      batchNumber: selectedStock.batchNumber,
      bulkQtyUsed: consumedKg,
      packetSize: selectedPacket.label,
      totalPackets,
      pricePerPacket: Number(pricePerPacket),
      costPerKg: selectedCostPerKg,
      productionCost: estimatedConsumedCost,
      costPerPacket: estimatedCostPerPacket,
      barcode,
    };

    addFinishedStockRow({
      id: `FS-OP-${Date.now()}`,
      sourceRoute: "packaging",
      sourceStockId: selectedStock.id,
      productName: selectedStock.mixName,
      type: "Own Production",
      packetSize: selectedPacket.label,
      quantity: totalPackets,
      pricePerUnit: Number(pricePerPacket),
      costPerUnit: estimatedCostPerPacket,
      productionCost: estimatedConsumedCost,
      productionDate: date,
      barcode,
    });

    setHistory((current) => [historyRow, ...current]);
    setStockRows(nextStockRows);
    setSelectedStockId("");
    setBulkQty("");
    setPricePerPacket("");
    setSelectedPacketLabel(defaultPacket.label);
    setIsDropdownOpen(false);
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
            Packaging
          </h1>
          <p className="mt-2 text-[20px] text-[#667085]">
            Convert bulk mix into packaged products
          </p>
        </div>

        <div className="mt-8 grid items-stretch gap-[30px] lg:grid-cols-[minmax(0,1fr)_345px]">
          <article className="rounded-[16px] border border-[#e1e5ea] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-[20px] font-bold text-[#171717]">Package Bulk Mix</h2>

            <div className="mt-8">
              <label className="mb-1 block text-[18px] font-bold text-[#171717]">
                Select Bulk Mix
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((current) => !current)}
                  className="flex h-[45px] w-full items-center justify-between rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-left text-[17px] font-semibold outline-none transition focus:ring-2 focus:ring-[#4f35f2]/25"
                >
                  <span className={selectedStock ? "text-[#111827]" : "text-[#73788b]"}>
                    {selectedStock ? `${selectedStock.mixName} - ${formatKg(selectedStock.quantityKg)} kg (${selectedStock.batchNumber})` : "Choose bulk mix"}
                  </span>
                  <span className="text-[#a0a4af]">
                    <ChevronIcon />
                  </span>
                </button>

                {isDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-[51px] z-20 max-h-[230px] overflow-y-auto rounded-[8px] border border-[#e1e5ea] bg-white p-1 shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
                    {stockRows.map((row, index) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => selectStock(row.id)}
                        className={[
                          "block w-full rounded-[6px] px-3 py-2.5 text-left text-[16px] text-[#171717] transition hover:bg-[#eef0f4]",
                          index === 0 ? "bg-[#e7e9ef]" : "bg-white",
                        ].join(" ")}
                      >
                        {row.mixName} - {formatKg(row.quantityKg)} kg ({row.batchNumber})
                      </button>
                    ))}
                    {stockRows.length === 0 ? (
                      <p className="px-3 py-3 text-[15px] text-[#667085]">
                        No bulk mix available
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-1 block text-[18px] font-bold text-[#171717]">
                Bulk Quantity to Package (kg)
              </span>
              <input
                type="number"
                min="0"
                max={selectedStock?.quantityKg || undefined}
                value={bulkQty}
                onChange={(event) => setBulkQty(event.target.value)}
                placeholder="Enter quantity"
                className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[17px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
              />
            </label>

            {selectedStock ? (
              <div className="mt-4 rounded-[12px] border border-[#dfe5ef] bg-[#f8fafc] p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[10px] bg-white p-3 shadow-sm">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#667085]">Production Cost/kg</p>
                    <p className="mt-1 text-[18px] font-extrabold text-[#111827]">৳{formatMoney(selectedCostPerKg)}</p>
                  </div>
                  <div className="rounded-[10px] bg-white p-3 shadow-sm">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#667085]">Selected Bulk Cost</p>
                    <p className="mt-1 text-[18px] font-extrabold text-[#111827]">৳{formatMoney(estimatedBulkCost)}</p>
                  </div>
                  <div className="rounded-[10px] bg-white p-3 shadow-sm">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-[#667085]">Cost/Packet</p>
                    <p className="mt-1 text-[18px] font-extrabold text-[#02a83d]">
                      {totalPackets > 0 ? `৳${formatMoney(estimatedCostPerPacket)}` : "Select qty + packet"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[14px] leading-5 text-[#667085]">
                  Cost calculation: consumed kg ({formatKg(consumedKg)} kg) × production cost/kg. Use this value to decide selling price per packet.
                </p>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="mb-3 text-[18px] font-bold text-[#171717]">
                Select Packet Size
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {packetSizes.map((packet) => {
                  const active = selectedPacket.label === packet.label;

                  return (
                    <button
                      key={packet.label}
                      type="button"
                      onClick={() => setSelectedPacketLabel(packet.label)}
                      className={[
                        "relative flex min-h-[94px] items-center gap-5 rounded-[10px] border-2 px-5 text-left transition",
                        active
                          ? "border-[#4a35ff] bg-[#eef3ff]"
                          : "border-[#dfe5ef] bg-white hover:border-[#b8c4d8]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                          active ? "border-[#eef3ff] bg-[#eef3ff]" : "border-[#eef2f7] bg-white",
                        ].join(" ")}
                      >
                        {active ? <span className="h-2.5 w-2.5 rounded-full bg-[#020617]" /> : null}
                      </span>
                      <span>
                        <span className="block text-[20px] font-extrabold text-[#08090d]">
                          {packet.label}
                        </span>
                        <span className="mt-1 block text-[14px] font-semibold text-[#52647f]">
                          {packet.subtitle}
                        </span>
                      </span>
                      {active ? (
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#4f35f2]">
                          <CheckIcon />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="mb-1 block text-[18px] font-bold text-[#171717]">
                Price per Packet ({"\u09F3"})
              </span>
              <input
                type="number"
                min="0"
                value={pricePerPacket}
                onChange={(event) => setPricePerPacket(event.target.value)}
                placeholder="Enter selling price per packet"
                className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[17px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
              />
            </label>

            <button
              type="button"
              onClick={handlePackNow}
              disabled={!canPack}
              className="mt-5 inline-flex h-[45px] w-full items-center justify-center gap-4 rounded-[9px] bg-[#78d29a] text-[18px] font-bold text-white transition hover:bg-[#63c986] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BoxIcon />
              Pack Now
            </button>
          </article>

          <aside className="rounded-[16px] border border-[#bfd0ff] bg-[#f1f1ff] p-6 text-[#2d2b9f] shadow-sm sm:p-8">
            <h2 className="text-[20px] font-bold">Packaging Info</h2>

            <div className="mt-8 rounded-[12px] bg-white/60 p-4">
              <h3 className="text-[17px] font-bold">Available Sizes</h3>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-[16px] leading-5 text-[#312bff]">
                {packetSizes.map((packet) => (
                  <li key={packet.label}>{packet.label} packets</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-[12px] bg-white/60 p-4">
              <h3 className="text-[17px] font-bold">Process</h3>
              <p className="mt-3 text-[16px] leading-6 text-[#312bff]">
                Select bulk mix, choose packet size, enter quantity, and pack into finished products.
              </p>
            </div>
          </aside>
        </div>

        <article className="mt-8 rounded-[16px] border border-[#e1e5ea] bg-white px-6 py-7 shadow-sm sm:px-8">
          <h2 className="text-[20px] font-bold text-[#171717]">Packaging History</h2>

          <div className="mt-9 overflow-x-auto">
            <table className="min-w-[900px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  {["Date", "Mix Name", "Bulk Qty Used", "Packet Size", "Cost/Packet", "Total Packets"].map((header) => (
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
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] text-[#171717]">
                      {row.date}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] font-bold text-[#171717]">
                      {row.mixName}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] text-[#171717]">
                      {formatKg(row.bulkQtyUsed)} kg
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px]">
                      <span className="inline-flex rounded-[5px] bg-[#dfe4ff] px-2.5 py-1 text-[14px] font-bold text-[#4f35f2]">
                        {row.packetSize}
                      </span>
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] font-bold text-[#111827]">
                      ৳{formatMoney(row.costPerPacket)}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-4 text-[16px] font-bold text-[#02a83d]">
                      {Number(row.totalPackets || 0).toLocaleString("en-US")} pcs
                    </td>
                  </tr>
                ))}
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-10 text-center text-[15px] text-[#667085]">
                      No packaging history found.
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
