"use client";

import { useEffect, useMemo, useState } from "react";
import TableImportDialog from "./LazyTableImportDialog";
import { useTableImport } from "../hooks/useTableImport";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getNextPrefixedId, inferStockStatus } from "../utils/tableImport";

const stockTabs = ["Repacking Product stock", "Repackaging Production"];
export const PACKAGING_STOCK_STORAGE_KEY = "erp-packaging-stock";
export const REPACKAGING_PRODUCTION_STORAGE_KEY = "erp-repackaging-production-rows";
const storageKey = REPACKAGING_PRODUCTION_STORAGE_KEY;

export const repackingStockRows = [];

export const defaultRepackagingRows = [];


const packagingStockImportColumns = [
  { key: "id", label: "ID", required: false },
  { key: "productName", label: "Repackaging product Name", aliases: ["Product Name", "Item Name", "Name"] },
  { key: "currentStock", label: "Current Stock", aliases: ["Stock", "Quantity", "Qty"] },
  { key: "minimumStock", label: "Minimum Stock", aliases: ["Min Stock", "Reorder Level"] },
  { key: "status", label: "Status", required: false },
];

const repackingProductionImportColumns = [
  { key: "id", label: "ID", required: false },
  { key: "productName", label: "Repackaging Product Name", aliases: ["Source Name", "Source Product", "Product Name"] },
  { key: "repackingName", label: "Repackaging Production Name", aliases: ["Production Name", "Repacking Production Name"] },
  { key: "repackQuantity", label: "Repack Quantity", aliases: ["Quantity", "Qty"] },
  { key: "beforeQuantity", label: "Before Quantity", required: false },
  { key: "afterQuantity", label: "After Quantity", required: false },
  { key: "status", label: "Status", required: false },
  { key: "actions", label: "Actions", required: false },
];

const productOptions = ["Bulk Biscuit", "Bulk Chips", "Bulk Candy", "Bulk Cake"];

const emptyForm = {
  id: "",
  productionName: "",
  productName: "Bulk Biscuit",
  beforeQuantity: "Auto show",
  afterQuantity: "1",
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4L16.5 3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function lowEnoughChip(status) {
  if (status === "enough") {
    return "bg-[#dcfce7] text-[#16a34a]";
  }

  return "bg-[#ffedd5] text-[#f97316]";
}

function productionChip(status) {
  if (status === "Completed") {
    return "bg-[#dcfce7] text-[#16a34a]";
  }

  return "bg-[#fff1e8] text-[#f97316]";
}

function loadStoredRows() {
  if (typeof window === "undefined") {
    return defaultRepackagingRows;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return defaultRepackagingRows;
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : defaultRepackagingRows;
  } catch {
    return defaultRepackagingRows;
  }
}

export default function RepackingProductionPanel() {
  const [activeTab, setActiveTab] = useState("Repacking Product stock");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState(null);
  const [repackagingRows, setRepackagingRows] = useState(defaultRepackagingRows);
  const [packagingStockRows, setPackagingStockRows] = useState(repackingStockRows);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setRepackagingRows(loadStoredRows());
    try {
      const storedStock = window.localStorage.getItem(PACKAGING_STOCK_STORAGE_KEY);
      if (storedStock) {
        const parsedStock = JSON.parse(storedStock);
        if (Array.isArray(parsedStock)) setPackagingStockRows(parsedStock);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(repackagingRows));
  }, [repackagingRows]);

  useEffect(() => {
    window.localStorage.setItem(PACKAGING_STOCK_STORAGE_KEY, JSON.stringify(packagingStockRows));
  }, [packagingStockRows]);

  const isStockView = activeTab === "Repacking Product stock";

  const filteredStock = useMemo(() => {
    return packagingStockRows.filter((item) =>
      [item.id, item.productName, item.currentStock, item.minimumStock, item.status]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase())
    );
  }, [packagingStockRows, debouncedSearchQuery]);

  const filteredProduction = useMemo(() => {
    return repackagingRows.filter((item) =>
      [item.id, item.sourceName, item.productName, item.productionName, item.repackingName, item.repackQuantity, item.beforeQuantity, item.afterQuantity, item.status]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase())
    );
  }, [repackagingRows, debouncedSearchQuery]);


  const packagingStockImport = useTableImport({
    columns: packagingStockImportColumns,
    existingRows: packagingStockRows,
    transformRow: (row, { index, existingRows }) => {
      const nextRow = {
        id: row.id || getNextPrefixedId(existingRows, "PK", "id", index),
        productName: row.productName || "",
        currentStock: row.currentStock || "0",
        minimumStock: row.minimumStock || "0",
      };
      return { ...nextRow, status: inferStockStatus(nextRow) };
    },
    onApply: setPackagingStockRows,
  });

  const repackingImport = useTableImport({
    columns: repackingProductionImportColumns,
    existingRows: repackagingRows,
    transformRow: (row, { index, existingRows }) => ({
      id: row.id || getNextPrefixedId(existingRows, "RPK", "id", index),
      sourceName: row.productName || "",
      productionName: row.repackingName || row.productName || "",
      repackQuantity: row.repackQuantity || "1 pc",
      beforeQuantity: row.beforeQuantity || "Auto show",
      afterQuantity: row.afterQuantity || "1",
      status: row.status || "Pending",
    }),
    onApply: setRepackagingRows,
  });

  const activeImport = isStockView ? packagingStockImport : repackingImport;

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
  };

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleAddProduction = (event) => {
    event.preventDefault();

    const productionName = formData.productionName.trim();
    if (!productionName) {
      return;
    }

    if (formData.id) {
      setRepackagingRows((current) =>
        current.map((item) =>
          item.id === formData.id
            ? {
                ...item,
                sourceName: formData.productName,
                productionName,
                repackQuantity: `${formData.afterQuantity} pc`,
                beforeQuantity: formData.beforeQuantity,
                afterQuantity: formData.afterQuantity,
              }
            : item
        )
      );
      closeModal();
      return;
    }

    const nextIdNumber =
      repackagingRows.reduce((maxId, item) => {
        const numericId = Number(item.id.replace("REP-", ""));
        return Number.isNaN(numericId) ? maxId : Math.max(maxId, numericId);
      }, 0) + 1;

    const nextRow = {
      id: `REP-${String(nextIdNumber).padStart(3, "0")}`,
      sourceName: formData.productName,
      productionName,
      repackQuantity: `${formData.afterQuantity} pc`,
      beforeQuantity: formData.beforeQuantity,
      afterQuantity: formData.afterQuantity,
      status: "Pending",
    };

    setRepackagingRows((current) => [nextRow, ...current]);
    setActiveTab("Repackaging Production");
    closeModal();
  };

  const handleComplete = (id) => {
    setRepackagingRows((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Completed" } : item
      )
    );
  };

  const handleEdit = (row) => {
    setFormData({
      id: row.id,
      productionName: row.productionName,
      productName: row.sourceName,
      beforeQuantity: row.beforeQuantity || "Auto show",
      afterQuantity: row.afterQuantity || row.repackQuantity.replace(" pc", ""),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (row) => {
    setDeletingRow(row);
  };

  const confirmDelete = () => {
    if (!deletingRow) {
      return;
    }

    setRepackagingRows((current) =>
      current.filter((item) => item.id !== deletingRow.id)
    );
    setDeletingRow(null);
  };

  return (
    <>
      <TableImportDialog
        title={isStockView ? "Import Packaging Stock Data" : "Import Repacking Production Data"}
        columns={isStockView ? packagingStockImportColumns : repackingProductionImportColumns}
        isOpen={activeImport.isDialogOpen}
        isLoading={activeImport.isLoading}
        errorMessage={activeImport.errorMessage}
        fileName={activeImport.fileName}
        preview={activeImport.preview}
        onClose={activeImport.closeDialog}
        onConfirm={activeImport.confirmImport}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {stockTabs.map((tab) => {
              const active = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] px-4 text-[14px] font-medium transition"
                  style={{
                    border: active
                      ? "1px solid var(--production-tab-active-border)"
                      : "1px solid var(--production-tab-border)",
                    background: active
                      ? "var(--production-tab-active-bg)"
                      : "var(--production-tab-bg)",
                    color: active
                      ? "var(--production-tab-active-text)"
                      : "var(--production-tab-text)",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={activeImport.openFilePicker}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#7aa2ff] bg-white px-4 text-[14px] font-medium text-[#1f2937] transition hover:bg-[#f8fbff]"
            >
              <ExportIcon />
              Export
            </button>
            <input
              ref={activeImport.inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={activeImport.handleFileChange}
            />

            {!isStockView ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#2f66e3] px-4 text-[14px] font-medium text-white shadow-[0_10px_24px_rgba(47,102,227,0.22)] transition hover:bg-[#2459d6]"
              >
                <PlusIcon />
                Make Production
              </button>
            ) : null}
          </div>
        </div>

        <div className="relative w-full max-w-[520px]">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              isStockView
                ? "Search by stock ID, product name, current stock, minimum stock, or status..."
                : "Search by production ID, product name, quantity, status, or stock..."
            }
            className="h-12 w-full rounded-[12px] border border-[#c9d4e5] bg-white pl-11 pr-4 text-[14px] text-[#344054] outline-none placeholder:text-[#98a2b3] focus:border-[#9db3de]"
          />
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[#dfe5ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            {isStockView ? (
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    {[
                      "ID",
                      "Repackaging product Name",
                      "Current stock",
                      "Minimum stock",
                      "Status",
                    ].map((header) => (
                      <th
                        key={header}
                        className="border-b border-[#e4e7ec] px-4 py-4 text-left text-[13px] font-semibold text-[#475467] first:rounded-tl-[18px] last:rounded-tr-[18px]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#2347ff]">
                        {item.id}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] text-[#344054]">
                        {item.productName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#1f6fff]">
                        {item.currentStock}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#1f6fff]">
                        {item.minimumStock}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-[12px] font-medium capitalize",
                            lowEnoughChip(item.status),
                          ].join(" ")}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-10 text-center text-[14px] text-[#667085]"
                      >
                        No repacking stock found for this search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : (
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    {[
                      "ID",
                      "Repackaging Production Name",
                      "Repack Quantity",
                      "Status",
                      "Actions",
                      "Edit",
                    ].map((header) => (
                      <th
                        key={header}
                        className="border-b border-[#e4e7ec] px-4 py-4 text-left text-[13px] font-semibold text-[#475467] first:rounded-tl-[18px] last:rounded-tr-[18px]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProduction.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#2347ff]">
                        {item.id}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] text-[#344054]">
                        {item.productionName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] text-[#344054]">
                        {item.repackQuantity}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-[12px] font-medium",
                            productionChip(item.status),
                          ].join(" ")}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        {item.status !== "Completed" ? (
                          <button
                            type="button"
                            onClick={() => handleComplete(item.id)}
                            className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#2d30ff] px-3 text-[12px] font-medium text-white hover:bg-[#2326e6]"
                          >
                            Complete
                          </button>
                        ) : null}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        {item.status !== "Completed" ? (
                          <div className="flex items-center gap-3 text-[#344054]">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#f2f4f7]"
                              aria-label={`Edit ${item.id}`}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#ef4444] transition hover:bg-[#fef2f2]"
                              aria-label={`Delete ${item.id}`}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {filteredProduction.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-10 text-center text-[14px] text-[#667085]"
                      >
                        No repackaging production found for this search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/45 p-4 backdrop-blur-[2px] transition",
          isModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="max-h-[90vh] w-full max-w-[660px] overflow-y-auto rounded-[24px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[18px] font-semibold text-[#181d27] sm:text-[20px]">
              {formData.id
                ? "Edit Repackaging Production Name"
                : "Add Repackaging Production Name"}
            </h3>

            <button
              type="button"
              onClick={closeModal}
              className="grid h-10 w-10 place-items-center rounded-full text-[#344054] transition hover:bg-[#f8fafc]"
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>

          <form onSubmit={handleAddProduction} className="mt-6">
            <label className="block">
              <span className="mb-2 block text-[14px] font-medium text-[#667085]">
                Repackaging Production Name
              </span>
              <input
                type="text"
                value={formData.productionName}
                onChange={(event) => handleChange("productionName", event.target.value)}
                placeholder="Enter name"
                className="h-11 w-full rounded-[14px] border border-[#d9e2ef] px-4 text-[15px] text-[#181d27] outline-none placeholder:text-[#98a2b3] focus:border-[#2f66e3]"
                required
              />
            </label>

            <div className="mt-5">
              <h4 className="text-[16px] font-semibold text-[#181d27]">Items</h4>
            </div>

            <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e4e7ec]">
              <div className="grid grid-cols-[minmax(0,1.45fr)_110px_110px] gap-4 bg-[#f8fafc] px-4 py-3 text-[14px] font-semibold text-[#475467]">
                <span>Repackage Product name</span>
                <span>Before Quantity</span>
                <span>After Quantity</span>
              </div>

              <div className="grid grid-cols-1 gap-3 bg-white px-4 py-4 sm:grid-cols-[minmax(0,1.45fr)_110px_110px] sm:items-center">
                <select
                  value={formData.productName}
                  onChange={(event) => handleChange("productName", event.target.value)}
                  className="h-11 rounded-[12px] border border-[#d9e2ef] bg-white px-4 text-[14px] text-[#344054] outline-none focus:border-[#2f66e3]"
                >
                  {productOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={formData.beforeQuantity}
                  readOnly
                  className="h-11 rounded-[12px] border border-[#d9e2ef] bg-[#f8fafc] px-4 text-[14px] text-[#667085] outline-none"
                />

                <input
                  type="number"
                  min="1"
                  value={formData.afterQuantity}
                  onChange={(event) => handleChange("afterQuantity", event.target.value)}
                  className="h-11 rounded-[12px] border border-[#d9e2ef] px-4 text-[14px] text-[#344054] outline-none focus:border-[#2f66e3]"
                  required
                />
              </div>
            </div>

            <p className="mt-4 text-[14px] text-[#344054]">
              It will automated add in Inventory or Goods Product
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d9e2ef] bg-white px-4 text-[16px] font-medium text-[#181d27] transition hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2f66e3] px-4 text-[16px] font-medium text-white shadow-[0_14px_32px_rgba(47,102,227,0.24)] transition hover:bg-[#2459d6]"
              >
                {formData.id ? "Edit and save" : "Add For Repackaging"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/30 p-4 backdrop-blur-[2px] transition",
          deletingRow ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[430px] rounded-[14px] bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4 px-1 pb-3 pt-1">
            <h3 className="text-[15px] font-medium text-[#111827]">
              Are You sure Delete this Repackaging
            </h3>

            <button
              type="button"
              onClick={() => setDeletingRow(null)}
              className="grid h-7 w-7 place-items-center rounded-full text-[#344054] transition hover:bg-[#f8fafc]"
              aria-label="Close delete modal"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDeletingRow(null)}
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[#d9e2ef] bg-white px-4 text-[12px] font-medium text-[#111827] transition hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#ff3341] px-4 text-[12px] font-medium text-white transition hover:bg-[#eb2433]"
            >
              Yes,Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
