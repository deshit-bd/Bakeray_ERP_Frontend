"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushDbKey } from "../lib/apiSync";
import {
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";
import {
  defaultPurchases,
  readPurchases,
  subscribePurchases,
} from "../utils/purchaseStore";
import { buildMaterialStockSummary } from "../utils/materialStockStore";
import {
  downloadFactoryIssuesExcel,
  downloadFactoryIssuesPdf,
  printFactoryIssues,
} from "../utils/factoryIssueExport";

export const FACTORY_ISSUE_STORAGE_KEY = "erp_factory_issue_history_v1";

export const defaultFactoryIssueHistory = [];

const defaultHistory = [];

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 3 10 14" />
      <path d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function normalizeBatchName(value) {
  const clean = value.trim();
  if (!clean) return "";
  return `${clean}-001`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatQuantity(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue)
    ? numberValue.toLocaleString("en-US")
    : numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function readHistory() {
  if (typeof window === "undefined") return defaultHistory;
  try {
    const saved = window.localStorage.getItem(FACTORY_ISSUE_STORAGE_KEY);
    if (!saved) return defaultHistory;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaultHistory;
  } catch {
    return defaultHistory;
  }
}

async function fetchFactoryIssuesFromDb() {
  return readHistory();
}

async function saveFactoryIssueToDb(issue) {
  return issue;
}

async function resendFactoryIssueToDb(issue) {
  return { ...issue, status: "Sent", resentCount: Number(issue.resentCount || 0) + 1 };
}

export default function FactoryIssueManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [purchases, setPurchases] = useState(defaultPurchases);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);
  const [mixType, setMixType] = useState("");
  const [targetQty, setTargetQty] = useState("100");
  const [selectedMaterialKey, setSelectedMaterialKey] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [materials, setMaterials] = useState([]);
  const [history, setHistory] = useState(defaultHistory);
  const [formMessage, setFormMessage] = useState("");
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const tableRef = useRef(null);

  const unitOptions = useMemo(() => settings.units || [], [settings.units]);
  const productCategories = [];
  const rawStockOptions = useMemo(
    () =>
      buildMaterialStockSummary({ kind: "raw", purchases })
        .filter((item) => Number(item.currentStock || 0) > 0),
    [purchases, stockRefreshKey]
  );
  const selectedStock = useMemo(
    () => rawStockOptions.find((item) => item.stockKey === selectedMaterialKey),
    [rawStockOptions, selectedMaterialKey]
  );
  const selectedUnit = selectedStock?.unit || unitOptions[0] || "kg";

  useEffect(() => {
    let mounted = true;
    fetchFactoryIssuesFromDb().then((rows) => { if (mounted) setHistory(rows); });
    setPurchases(readPurchases());
    return () => { mounted = false; };
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);
  useEffect(() => subscribePurchases(setPurchases), []);

  useEffect(() => {
    if (!rawStockOptions.some((item) => item.stockKey === selectedMaterialKey)) {
      setSelectedMaterialKey(rawStockOptions[0]?.stockKey || "");
    }
  }, [rawStockOptions, selectedMaterialKey]);


  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FACTORY_ISSUE_STORAGE_KEY, JSON.stringify(history));
      setStockRefreshKey((current) => current + 1);
    }
  }, [history]);

  const batchName = useMemo(() => normalizeBatchName(mixType), [mixType]);
  const canSend = mixType.trim() && Number(targetQty) > 0 && materials.length > 0;

  const getVisibleIssues = () => {
    const table = tableRef.current;
    if (!table) return history;

    const issueById = new Map(history.map((issue) => [String(issue.id), issue]));
    const visibleIssues = Array.from(table.querySelectorAll("tbody tr[data-issue-id]"))
      .filter((row) => row.style.display !== "none")
      .map((row) => issueById.get(row.dataset.issueId))
      .filter(Boolean);

    return visibleIssues;
  };

  const getSelectedIssues = () => {
    const selected = new Set(selectedIssueIds.map(String));
    return getVisibleIssues().filter((issue) => selected.has(String(issue.id)));
  };

  const getBulkExportIssues = () => {
    const selected = getSelectedIssues();
    return selected.length > 0 ? selected : getVisibleIssues();
  };

  const toggleIssueSelection = (issueId) => {
    setSelectedIssueIds((current) =>
      current.includes(String(issueId))
        ? current.filter((id) => id !== String(issueId))
        : [...current, String(issueId)]
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = getVisibleIssues().map((issue) => String(issue.id));
    const selected = new Set(selectedIssueIds.map(String));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

    setSelectedIssueIds((current) => {
      const currentSet = new Set(current.map(String));
      if (allVisibleSelected) {
        visibleIds.forEach((id) => currentSet.delete(id));
      } else {
        visibleIds.forEach((id) => currentSet.add(id));
      }
      return Array.from(currentSet);
    });
  };

  const queuedQuantityForStock = (stockKey) =>
    materials
      .filter((material) => material.stockKey === stockKey)
      .reduce((sum, material) => sum + Number(material.quantity || 0), 0);

  const validateIssueStock = (issueMaterials) => {
    const latestStockByKey = new Map(
      buildMaterialStockSummary({ kind: "raw", purchases }).map((item) => [item.stockKey, item])
    );
    const requiredByKey = new Map();

    issueMaterials.forEach((material) => {
      requiredByKey.set(
        material.stockKey,
        (requiredByKey.get(material.stockKey) || 0) + Number(material.quantity || 0)
      );
    });

    for (const [stockKey, requiredQuantity] of requiredByKey.entries()) {
      const stock = latestStockByKey.get(stockKey);
      if (!stock || requiredQuantity > Number(stock.currentStock || 0)) {
        const name = stock?.name || "Selected material";
        const unit = stock?.unit || "kg";
        const available = stock?.currentStock || 0;
        return `Stock a nai. ${name} available ${formatQuantity(available)} ${unit}.`;
      }
    }

    return "";
  };

  const addMaterial = () => {
    const quantity = Number(materialQty);
    if (!selectedStock || quantity <= 0) return;

    const totalRequested = queuedQuantityForStock(selectedStock.stockKey) + quantity;
    if (totalRequested > Number(selectedStock.currentStock || 0)) {
      setFormMessage(
        `Stock a nai. ${selectedStock.name} available ${formatQuantity(selectedStock.currentStock)} ${selectedStock.unit}.`
      );
      return;
    }

    setMaterials((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: selectedStock.name,
        quantity,
        unit: selectedStock.unit,
        stockKey: selectedStock.stockKey,
      },
    ]);
    setMaterialQty("");
    setFormMessage("");
  };

  const removeMaterial = (id) => {
    setMaterials((current) => current.filter((material) => material.id !== id));
  };

  const sendToFactory = async () => {
    if (!canSend) return;

    const stockError = validateIssueStock(materials);
    if (stockError) {
      setFormMessage(stockError);
      return;
    }

    const newIssue = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: todayDate(),
      batchName,
      mixType: mixType.trim(),
      targetQty: `${Number(targetQty)} kg`,
      materials,
      status: "Sent",
    };

    try {
      const savedIssue = await saveFactoryIssueToDb(newIssue);
      const nextHistory = [savedIssue, ...history.filter((item) => String(item.id) !== String(savedIssue.id))];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FACTORY_ISSUE_STORAGE_KEY, JSON.stringify(nextHistory));
        flushDbKey(FACTORY_ISSUE_STORAGE_KEY).catch(() => {});
      }
      setHistory(nextHistory);
    } catch (error) {
      setFormMessage(error.message || "Factory issue save failed");
      return;
    }
    setMixType("");
    setTargetQty("100");
    setSelectedMaterialKey(rawStockOptions[0]?.stockKey || "");
    setMaterialQty("");
    setMaterials([]);
    setFormMessage("");
  };

  const handleResendToProduction = async (issue) => {
    try {
      setFormMessage("");
      const updated = await resendFactoryIssueToDb(issue);
      setHistory((current) =>
        current.map((item) => String(item.id) === String(issue.id) ? updated : item)
      );
    } catch (error) {
      setFormMessage(error.message || "Stock not available for resend");
    }
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">Factory Issue</h1>
          <p className="mt-2 text-[19px] text-[#667085]">Send raw materials to production floor</p>
        </div>

        <article className="mt-8 rounded-[14px] border border-[#e1e5ea] bg-white p-7 shadow-sm">
          <h2 className="text-[20px] font-bold text-[#171717]">Create Factory Issue</h2>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[18px] font-bold text-[#171717]">Mix Type</span>
              <input
                value={mixType}
                onChange={(event) => setMixType(event.target.value)}
                placeholder="Enter mix type, e.g., Cake Mix"
                className="h-[45px] w-full rounded-[8px] border-0 bg-[#f1f1f4] px-4 text-[16px] font-semibold text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[18px] font-bold text-[#171717]">Batch Name (Auto-generated)</span>
              <input
                value={batchName}
                readOnly
                placeholder="Enter mix type first"
                className="h-[45px] w-full rounded-[8px] border-0 bg-[#fbfbfc] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#a0a4af]"
              />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-[18px] font-bold text-[#171717]">Target Quantity to Produce (kg or pcs)</span>
            <input
              type="number"
              min="0"
              value={targetQty}
              onChange={(event) => setTargetQty(event.target.value)}
              placeholder="100"
              className="h-[45px] w-full rounded-[8px] border-0 bg-[#f1f1f4] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
            />
          </label>

          <div className="my-7 border-t border-[#e5e7eb]" />

          <h3 className="text-[21px] font-bold text-[#171717]">Manual Material Entry</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-[1.28fr_1fr_160px_75px] md:items-center">
            <div className="relative">
              <select
                value={selectedMaterialKey}
                onChange={(event) => setSelectedMaterialKey(event.target.value)}
                className="h-[45px] w-full appearance-none rounded-[8px] border-0 bg-[#f1f1f4] px-4 pr-10 text-[17px] font-semibold text-[#111827] outline-none focus:ring-2 focus:ring-[#4f35f2]/25"
              >
                {rawStockOptions.length === 0 ? (
                  <option value="">No raw material stock</option>
                ) : null}
                {rawStockOptions.map((material) => (
                  <option key={material.stockKey} value={material.stockKey}>
                    {material.name} ({formatQuantity(material.currentStock)} {material.unit})
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af]"><ChevronIcon /></span>
            </div>

            <input
              type="number"
              min="0"
              value={materialQty}
              onChange={(event) => setMaterialQty(event.target.value)}
              placeholder="Quantity"
              className="h-[45px] w-full rounded-[8px] border-0 bg-[#f1f1f4] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
            />

            <div className="relative">
              <input
                readOnly
                value={selectedUnit}
                className="h-[45px] w-full rounded-[8px] border-0 bg-[#fbfbfc] px-4 text-[17px] font-semibold text-[#111827] outline-none"
              />
            </div>

            <button
              type="button"
              onClick={addMaterial}
              className="inline-flex h-[45px] items-center justify-center rounded-[9px] bg-[#030316] text-white transition hover:bg-[#111827]"
              aria-label="Add material"
            >
              <PlusIcon />
            </button>
          </div>

          {formMessage ? (
            <p className="mt-3 rounded-[8px] bg-[#fff1f2] px-4 py-3 text-[15px] font-semibold text-[#be123c]">
              {formMessage}
            </p>
          ) : null}

          {materials.length > 0 && (
            <div className="mt-4 rounded-[8px] bg-[#f7f9fc] p-4">
              <h4 className="mb-3 text-[16px] font-bold text-[#344054]">Materials to Issue:</h4>
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between rounded-[5px] border border-[#e1e5ea] bg-white px-3 py-3 text-[16px] text-[#111827]">
                    <span><strong>{material.name}:</strong> {material.quantity} {material.unit}</span>
                    <button type="button" onClick={() => removeMaterial(material.id)} className="text-[28px] leading-none text-[#111827] hover:text-[#ef4444]" aria-label={`Remove ${material.name}`}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={sendToFactory}
            disabled={!canSend}
            className="mt-5 inline-flex h-[45px] w-full items-center justify-center gap-4 rounded-[8px] bg-[#4f35f2] text-[17px] font-bold text-white shadow-sm transition hover:bg-[#462ee0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SendIcon />
            <span>Send to Factory</span>
          </button>
        </article>

        <article className="mt-8 rounded-[14px] border border-[#e1e5ea] bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-[#171717]">Issue History</h2>
              <p className="mt-2 text-[15px] text-[#64748b]">
                Select one or more mixes, then print or download. Without selection, visible rows are used.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => printFactoryIssues(getBulkExportIssues())}
                className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[8px] border border-[#d5d9e2] bg-white px-4 text-[15px] font-semibold text-[#1f2937] transition hover:bg-[#f8fafc]"
              >
                <PrintIcon />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFactoryIssuesPdf(getBulkExportIssues())}
                className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[8px] border border-[#d5d9e2] bg-white px-4 text-[15px] font-semibold text-[#1f2937] transition hover:bg-[#f8fafc]"
              >
                <DownloadIcon />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFactoryIssuesExcel(getBulkExportIssues())}
                className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[8px] bg-[#16a34a] px-4 text-[15px] font-semibold text-white transition hover:bg-[#15803d]"
              >
                <DownloadIcon />
                <span>Excel</span>
              </button>
            </div>
          </div>
          <div className="mt-8 overflow-x-auto">
            <table ref={tableRef} className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">
                    <input
                      type="checkbox"
                      onChange={toggleVisibleSelection}
                      aria-label="Select visible factory issues"
                      className="h-4 w-4 accent-[#4f35f2]"
                    />
                  </th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Date</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Batch Name</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Mix Type</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Target Qty</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Materials Issued</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Status</th>
                  <th className="border-b border-[#e5e7eb] px-2 py-3 text-[17px] font-bold text-[#171717]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((issue) => (
                  <tr key={issue.id} data-issue-id={issue.id}>
                    <td className="border-b border-[#edf2f7] px-2 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIssueIds.includes(String(issue.id))}
                        onChange={() => toggleIssueSelection(issue.id)}
                        aria-label={`Select ${issue.batchName}`}
                        className="h-4 w-4 accent-[#4f35f2]"
                      />
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-4 text-[16px] text-[#171717]">{issue.date}</td>
                    <td className="border-b border-[#edf2f7] px-2 py-4 text-[16px] font-bold text-[#171717]">
                      <span className="rounded-[5px] bg-[#dfe4ff] px-3 py-1 font-mono text-[14px] text-[#4f35f2]">{issue.batchName}</span>
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-4 text-[16px] font-bold text-[#171717]">{issue.mixType}</td>
                    <td className="border-b border-[#edf2f7] px-2 py-4 text-[16px] text-[#171717]">{issue.targetQty}</td>
                    <td className="border-b border-[#edf2f7] px-2 py-4 text-[14px] leading-6 text-[#475467]">
                      {issue.materials.map((material, index) => (
                        <div key={`${issue.id}-${material.name}-${index}`}>{material.name}: {material.quantity} {material.unit}</div>
                      ))}
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={["rounded-full px-4 py-1.5 text-[14px] font-bold", String(issue.status).toLowerCase() === "completed" ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#dcfce7] text-[#149447]"].join(" ")}>{issue.status}</span>
                        {String(issue.status).toLowerCase() === "completed" ? (
                          <button
                            type="button"
                            onClick={() => handleResendToProduction(issue)}
                            className="rounded-full border border-[#4f35f2]/30 bg-white px-3 py-1 text-[13px] font-bold text-[#4f35f2] transition hover:bg-[#eef2ff]"
                          >
                            Resend to Production
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-[#edf2f7] px-2 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => printFactoryIssues([issue])}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-[7px] border border-[#d5d9e2] bg-white px-2 text-[13px] font-bold text-[#1f2937] hover:bg-[#f8fafc]"
                        >
                          <PrintIcon />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFactoryIssuesPdf([issue])}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-[7px] border border-[#d5d9e2] bg-white px-2 text-[13px] font-bold text-[#1f2937] hover:bg-[#f8fafc]"
                        >
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFactoryIssuesExcel([issue])}
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-[7px] bg-[#16a34a] px-2 text-[13px] font-bold text-white hover:bg-[#15803d]"
                        >
                          <span>Excel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
