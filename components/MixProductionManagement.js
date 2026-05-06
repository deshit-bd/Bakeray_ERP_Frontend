"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FACTORY_ISSUE_STORAGE_KEY,
  defaultFactoryIssueHistory,
} from "./FactoryIssueManagement";
import {
  DEFAULT_BULK_MIX_COST_PER_KG,
  addBulkMixStockRow,
} from "../utils/bulkMixStockStore";

export const MIX_BATCHES_STORAGE_KEY = "erp_mix_production_batches_v1";
export const MIX_PRODUCTION_HISTORY_STORAGE_KEY = "erp_mix_production_history_v1";

const defaultBatchNames = [];

export const defaultMixProductionHistory = [];

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M8 5v14l11-7-11-7Z" />
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function loadStoredArray(key, fallback) {
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

function saveStoredArray(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage write issues.
  }
}

async function apiGetRows(path, fallback = []) {
  return fallback;
}

async function apiPostRow(path, row) {
  return row;
}

function uniqueValues(values) {
  const seen = new Set();

  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatQuantity(value) {
  const numberValue = Number(value || 0);
  return Number.isInteger(numberValue) ? numberValue : numberValue.toFixed(2);
}

function formatMaterialLine(material, index) {
  const name = material?.name || material?.materialName || `Material ${index + 1}`;
  const quantity = material?.quantity ?? material?.qty ?? "";
  const unit = material?.unit || "kg";

  if (quantity === "") return name;
  return `${name}: ${quantity} ${unit}`;
}

function getIssueMaterials(issue) {
  if (!issue || !Array.isArray(issue.materials)) return [];

  return issue.materials.map((material, index) => ({
    id: material.id || `${issue.id || issue.batchName}-${index}`,
    name: material.name || material.materialName || `Material ${index + 1}`,
    quantity: Number(material.quantity || material.qty || 0),
    unit: material.unit || "kg",
  }));
}

function displayBatchName(batchName) {
  return batchName || "Manual Batch";
}

function getStockMixName(selectedIssue, selectedBatch) {
  if (selectedIssue?.mixType) return selectedIssue.mixType;
  return String(selectedBatch || "Custom Mix").replace(/-\d+$/, "").trim() || "Custom Mix";
}

export default function MixProductionManagement() {
  const [factoryIssues, setFactoryIssues] = useState(defaultFactoryIssueHistory);
  const [manualBatches, setManualBatches] = useState(defaultBatchNames);
  const [history, setHistory] = useState(defaultMixProductionHistory);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [outputMix, setOutputMix] = useState("");
  const [lossKg, setLossKg] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [isStorageReady, setIsStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const storedBatches = loadStoredArray(MIX_BATCHES_STORAGE_KEY, defaultBatchNames);
    Promise.all([
      apiGetRows("factory-issues", loadStoredArray(FACTORY_ISSUE_STORAGE_KEY, defaultFactoryIssueHistory)),
      apiGetRows("mix-productions", loadStoredArray(MIX_PRODUCTION_HISTORY_STORAGE_KEY, defaultMixProductionHistory)),
    ]).then(([issues, productions]) => {
      if (!mounted) return;
      setFactoryIssues(issues);
      setManualBatches(uniqueValues([...defaultBatchNames, ...storedBatches]));
      setHistory(productions);
      setIsStorageReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    saveStoredArray(MIX_BATCHES_STORAGE_KEY, manualBatches);
  }, [isStorageReady, manualBatches]);

  useEffect(() => {
    if (!isStorageReady) return;
    saveStoredArray(MIX_PRODUCTION_HISTORY_STORAGE_KEY, history);
  }, [history, isStorageReady]);

  const sentFactoryIssues = useMemo(
    () => factoryIssues.filter((issue) => String(issue.status || "Sent").toLowerCase() === "sent"),
    [factoryIssues]
  );

  const factoryBatchNames = useMemo(
    () => sentFactoryIssues.map((issue) => issue.batchName),
    [sentFactoryIssues]
  );

  const batchOptions = useMemo(
    () => uniqueValues([...manualBatches, ...factoryBatchNames]),
    [factoryBatchNames, manualBatches]
  );

  const selectedIssue = useMemo(
    () => sentFactoryIssues.find((issue) => issue.batchName === selectedBatch),
    [sentFactoryIssues, selectedBatch]
  );

  const availableBatchChips = useMemo(
    () => uniqueValues([...batchOptions]).slice(0, 12),
    [batchOptions]
  );

  const selectedIssueMaterials = useMemo(() => getIssueMaterials(selectedIssue), [selectedIssue]);

  const selectedIssueTotalIssued = useMemo(
    () => selectedIssueMaterials.reduce((sum, material) => sum + Number(material.quantity || 0), 0),
    [selectedIssueMaterials]
  );

  const selectedIssueUnit = selectedIssueMaterials[0]?.unit || "kg";

  const canComplete =
    Boolean(selectedBatch) &&
    Number(outputMix) > 0 &&
    (lossKg === "" || Number(lossKg) >= 0);

  const handleAddBatch = () => {
    const batchName = newBatchName.trim();
    if (!batchName) return;

    setManualBatches((current) => uniqueValues([...current, batchName]));
    setSelectedBatch(batchName);
    setNewBatchName("");
    setIsBatchModalOpen(false);
    setIsDropdownOpen(false);
  };

  const handleCompleteProduction = async () => {
    if (!canComplete) return;

    const outputValue = Number(outputMix);
    const lossValue = lossKg === "" ? 0 : Number(lossKg);
    const materials = getIssueMaterials(selectedIssue);

    const nextRecord = {
      id: `mix-production-${Date.now()}`,
      batchName: selectedIssue?.mixType
        ? `${selectedIssue.mixType} Batch #${String(history.length + 1).padStart(3, "0")}`
        : selectedBatch,
      batchKey: selectedBatch,
      date: todayDate(),
      materials,
      outputKg: outputValue,
      lossKg: lossValue,
      status: "Completed",
    };
    const stockId = `bulk-mix-${Date.now()}`;

    let savedRecord = nextRecord;
    try {
      savedRecord = await apiPostRow("mix-productions", nextRecord);
    } catch (error) {
      return;
    }

    setHistory((current) => [savedRecord, ...current.filter((item) => String(item.id) !== String(savedRecord.id))]);
    addBulkMixStockRow({
      id: stockId,
      mixName: getStockMixName(selectedIssue, selectedBatch),
      batchNumber: selectedBatch,
      quantityKg: outputValue,
      costPerKg: DEFAULT_BULK_MIX_COST_PER_KG,
      productionDate: nextRecord.date,
      productionId: nextRecord.id,
    });

    if (selectedIssue) {
      const updatedIssues = factoryIssues.map((issue) =>
        issue.id === selectedIssue.id ? { ...issue, status: "Completed" } : issue
      );
      setFactoryIssues(updatedIssues);
      saveStoredArray(FACTORY_ISSUE_STORAGE_KEY, updatedIssues);
    }

    setSelectedBatch("");
    setOutputMix("");
    setLossKg("");
    setIsDropdownOpen(false);
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <div>
            <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">
              Mix Production
            </h1>
            <p className="mt-2 text-[20px] text-[#667085]">
              Manage production batches and track output
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
            <article className="rounded-[16px] border border-[#e1e5ea] bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-[20px] font-bold text-[#171717]">
                Create New Production Batch
              </h2>

              <div className="mt-10 flex items-center justify-between gap-4">
                <label className="text-[18px] font-bold text-[#171717]">
                  Batch Name
                </label>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="inline-flex h-[35px] items-center justify-center gap-3 rounded-[9px] border border-[#e1e5ea] bg-white px-4 text-[16px] font-semibold text-[#171717] transition hover:bg-[#f8fafc]"
                >
                  <PlusIcon />
                  Add Batch
                </button>
              </div>

              <div className="relative mt-4">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((current) => !current)}
                  className="flex h-[45px] w-full items-center justify-between rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-left text-[17px] font-semibold text-[#111827] outline-none transition focus:ring-2 focus:ring-[#4f35f2]/25"
                >
                  <span className={selectedBatch ? "text-[#111827]" : "text-[#73788b]"}>
                    {selectedBatch || "Select batch from Factory Issue"}
                  </span>
                  <span className="text-[#9ca3af]">
                    <ChevronIcon />
                  </span>
                </button>

                {isDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-[50px] z-20 max-h-[240px] overflow-y-auto rounded-[8px] border border-[#e5e7eb] bg-white p-1 shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
                    {batchOptions.map((batch, index) => (
                      <button
                        key={batch}
                        type="button"
                        onClick={() => {
                          setSelectedBatch(batch);
                          setIsDropdownOpen(false);
                        }}
                        className={[
                          "block w-full rounded-[6px] px-3 py-2 text-left text-[17px] text-[#171717] transition hover:bg-[#eef0f4]",
                          index === 0 ? "bg-[#e7e9ef]" : "bg-white",
                        ].join(" ")}
                      >
                        {batch}
                      </button>
                    ))}
                    {batchOptions.length === 0 ? (
                      <p className="px-3 py-3 text-[15px] text-[#667085]">
                        No batches found. Add a batch first.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <p className="mt-2 text-[14px] text-[#5f7494]">
                Select a batch or click "Add Batch" to create new one
              </p>

              {selectedBatch ? (
                <div className="mt-4 rounded-[12px] border border-[#dfe5ef] bg-[#f8fafc] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-[#344054]">Selected Factory Issue Summary</p>
                      <p className="mt-1 text-[14px] text-[#667085]">
                        Batch: <span className="font-semibold text-[#111827]">{selectedBatch}</span>
                        {selectedIssue?.mixType ? ` • Mix: ${selectedIssue.mixType}` : ""}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-white px-4 py-2 text-right shadow-sm">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-[#667085]">Total Issued</p>
                      <p className="text-[20px] font-extrabold text-[#111827]">
                        {formatQuantity(selectedIssueTotalIssued)} {selectedIssueUnit}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[520px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="text-left">
                          {["Material", "Issued Qty", "Unit"].map((header) => (
                            <th key={header} className="border-b border-[#e5e7eb] px-3 py-2 text-[14px] font-bold text-[#475467]">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedIssueMaterials.length > 0 ? (
                          selectedIssueMaterials.map((material, index) => (
                            <tr key={`${selectedBatch}-${material.name}-${index}`}>
                              <td className="border-b border-[#edf2f7] px-3 py-2 text-[14px] font-semibold text-[#111827]">{material.name}</td>
                              <td className="border-b border-[#edf2f7] px-3 py-2 text-[14px] text-[#111827]">{formatQuantity(material.quantity)}</td>
                              <td className="border-b border-[#edf2f7] px-3 py-2 text-[14px] text-[#667085]">{material.unit}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-3 py-3 text-center text-[14px] text-[#667085]">
                              No materials linked with this batch.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[18px] font-bold text-[#171717]">
                    Output Mix (kg)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={outputMix}
                    onChange={(event) => setOutputMix(event.target.value)}
                    placeholder="0"
                    className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[17px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[18px] font-bold text-[#171717]">
                    Loss (kg) - Optional
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={lossKg}
                    onChange={(event) => setLossKg(event.target.value)}
                    placeholder="0"
                    className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[17px] text-[#111827] outline-none placeholder:text-[#73788b] focus:ring-2 focus:ring-[#4f35f2]/25"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleCompleteProduction}
                disabled={!canComplete}
                className="mt-5 inline-flex h-[45px] w-full items-center justify-center gap-4 rounded-[9px] bg-[#08a940] text-[17px] font-bold text-white transition hover:bg-[#069237] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <PlayIcon />
                Complete Production
              </button>
            </article>

            <article className="rounded-[16px] border border-[#c6d0ff] bg-[#f0f1ff] p-6 text-[#302fb3] shadow-sm sm:p-7">
              <h2 className="text-[20px] font-bold">Production Guidelines</h2>

              <div className="mt-8 space-y-5">
                {[
                  ["1", "Select Batch Name", "Choose batch from Factory Issue records"],
                  ["2", "Enter Output Quantity", "Total bulk mix produced in kg"],
                  ["3", "Record Loss (Optional)", "Any material loss during production"],
                ].map(([step, title, description]) => (
                  <div key={step} className="flex gap-3">
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#5238f4] text-[15px] font-bold text-white">
                      {step}
                    </span>
                    <div>
                      <p className="text-[17px] font-bold">{title}</p>
                      <p className="mt-1 text-[16px] leading-5 text-[#3833ff]">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[12px] border border-[#c3ccff] bg-white/45 px-4 py-4">
                <div className="flex items-center gap-2 text-[14px] font-bold text-[#344054]">
                  <InfoIcon />
                  Tip
                </div>
                <p className="mt-2 text-[14px] leading-5 text-[#3833ff]">
                  Track batch numbers carefully for quality control and traceability
                </p>
              </div>
            </article>
          </div>

          <article className="mt-8 rounded-[16px] border border-[#e1e5ea] bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-[20px] font-bold text-[#171717]">
              Production History
            </h2>

            <div className="mt-9 overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {[
                      "Batch Name",
                      "Date",
                      "Input Materials",
                      "Output (kg)",
                      "Loss (kg)",
                      "Status",
                    ].map((header) => (
                      <th
                        key={header}
                        className="border-b border-[#e5e7eb] px-3 py-3 text-[17px] font-bold text-[#171717]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td className="border-b border-[#edf2f7] px-3 py-5 text-[16px] font-bold text-[#171717]">
                        {displayBatchName(record.batchName)}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-5 text-[16px] text-[#171717]">
                        {record.date}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-5 text-[14px] leading-6 text-[#475467]">
                        {Array.isArray(record.materials) && record.materials.length > 0 ? (
                          record.materials.map((material, index) => (
                            <div key={`${record.id}-${material.name}-${index}`}>
                              {formatMaterialLine(material, index)}
                            </div>
                          ))
                        ) : (
                          <span>No linked Factory Issue materials</span>
                        )}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-5 text-[16px] font-bold text-[#02a83d]">
                        {formatQuantity(record.outputKg)} kg
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-5 text-[16px] text-[#ff2525]">
                        {formatQuantity(record.lossKg)} kg
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-5">
                        <span className="inline-flex rounded-full bg-[#d8f8df] px-4 py-1.5 text-[14px] font-bold text-[#149447]">
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-10 text-center text-[15px] text-[#667085]">
                        No production history found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <div
        className={[
          "fixed inset-0 z-50 flex items-start justify-center bg-[#111827]/55 p-4 pt-6 transition sm:items-center sm:pt-4",
          isBatchModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[640px] rounded-[8px] bg-white px-7 pb-7 pt-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[24px] font-bold text-[#171717]">
                Add New Batch Name
              </h3>
              <p className="mt-3 text-[18px] text-[#74788b]">
                Add a batch name to the available list
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="mt-[-4px] rounded-full p-1 text-[#555555] transition hover:bg-[#f1f1f4] hover:text-[#4f35f2]"
              aria-label="Close batch popup"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-[18px] font-bold text-[#171717]">
              Batch Name
            </label>
            <input
              value={newBatchName}
              onChange={(event) => setNewBatchName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleAddBatch();
              }}
              placeholder="e.g., Cake Mix-003, Custom Batch-001"
              className="h-[45px] w-full rounded-[9px] border border-[#b7b7bd] bg-[#f8f8fb] px-4 text-[17px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-4 focus:ring-[#111827]/20"
              autoFocus
            />
          </div>

          <div className="mt-5 rounded-[12px] bg-[#f6f8fc] p-4">
            <h4 className="mb-3 text-[18px] font-bold text-[#344054]">
              Available Batches:
            </h4>
            <div className="flex flex-wrap gap-2">
              {availableBatchChips.map((batch) => (
                <button
                  key={batch}
                  type="button"
                  onClick={() => setSelectedBatch(batch)}
                  className="rounded-[9px] border border-[#e1e5ea] bg-white px-3 py-1 text-[15px] font-semibold text-[#171717] transition hover:border-[#4f35f2] hover:text-[#4f35f2]"
                >
                  {batch}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleAddBatch}
              disabled={!newBatchName.trim()}
              className="inline-flex h-[45px] items-center justify-center rounded-[9px] bg-[#4f35f2] px-6 text-[18px] font-bold text-white transition hover:bg-[#462ee0] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Add Batch Name
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
