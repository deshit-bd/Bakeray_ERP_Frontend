"use client";

import { useEffect, useMemo, useState } from "react";
import TableImportDialog from "./LazyTableImportDialog";
import { useTableImport } from "../hooks/useTableImport";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getNextPrefixedId, inferStockStatus, parseNumericValue } from "../utils/tableImport";

export const inventoryItems = [];

export const INVENTORY_STORAGE_KEY = "erp-inventory-items";

const inventoryImportColumns = [
  { key: "id", label: "ID", required: false, aliases: ["Inventory ID"] },
  { key: "productName", label: "Product Name" },
  { key: "currentStock", label: "Current stock", aliases: ["Current Stock"] },
  { key: "minimumStock", label: "Minimum stock", aliases: ["Minimum Stock"] },
  { key: "status", label: "Status", required: false },
];

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

function AlertIcon() {
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
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4.5" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChevronIcon() {
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
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function statusChipClass(status) {
  if (status === "enough") {
    return "bg-[#dcfce7] text-[#16a34a]";
  }

  return "bg-[#ffedd5] text-[#f97316]";
}

export default function InventoryManagement() {
  const [items, setItems] = useState(inventoryItems);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);
  const [materialFilter, setMaterialFilter] = useState("All");
  const {
    inputRef: importInputRef,
    isDialogOpen: isImportDialogOpen,
    isLoading: isImportLoading,
    errorMessage: importErrorMessage,
    fileName: importFileName,
    preview: importPreview,
    openFilePicker,
    handleFileChange,
    closeDialog: closeImportDialog,
    confirmImport,
  } = useTableImport({
    columns: inventoryImportColumns,
    existingRows: items,
    onApply: setItems,
    transformRow: (row, { index, existingRows }) => {
      const currentStockValue = parseNumericValue(row.currentStock);
      const minimumStockValue = parseNumericValue(row.minimumStock);
      return {
        id: row.id || getNextPrefixedId(existingRows, "IM", "id", index),
        productName: row.productName,
        currentStock: row.currentStock || `${currentStockValue}pc`,
        minimumStock: row.minimumStock || `${minimumStockValue}pc`,
        status: inferStockStatus({
          currentStock: row.currentStock || currentStockValue,
          minimumStock: row.minimumStock || minimumStockValue,
        }),
      };
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (!stored) {
        setIsStorageReady(true);
        return;
      }

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      window.localStorage.removeItem(INVENTORY_STORAGE_KEY);
    } finally {
      setIsStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isStorageReady) {
      return;
    }

    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  }, [items, isStorageReady]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = [item.id, item.productName, item.currentStock, item.minimumStock]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());

      const matchesMaterial =
        materialFilter === "All" ||
        (materialFilter === "Material production" && item.status === "low") ||
        (materialFilter === "Available stock" && item.status === "enough");

      return matchesSearch && matchesMaterial;
    });
  }, [items, searchQuery, materialFilter]);

  const lowStockCount = items.filter((item) => item.status === "low").length;

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      <section className="min-w-0 flex-1 bg-[#f7f9fc] p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a]">
              Inventory Management
            </h1>
            <p className="mt-1 text-[15px] text-[#64748b]">
              Track and manage stock across warehouses
            </p>
          </div>

          <button
            type="button"
            onClick={openFilePicker}
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-[10px] border border-[#d5dce8] bg-white px-4 text-[14px] font-medium text-[#344054] transition hover:bg-[#f8fbff]"
          >
            <ExportIcon />
            Export
          </button>
        </div>

        <div className="mt-4 rounded-[10px] border border-[#ffd2a6] bg-[#fff7ed] px-4 py-4 text-[13px] text-[#9a3412]">
          <div className="flex items-center gap-2">
            <span className="text-[#f97316]">
              <AlertIcon />
            </span>
            <span>
              <span className="font-semibold">{lowStockCount} items</span> are running low
              on stock. Please reorder soon.
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[560px]">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by product ID, product name, stock quantity, minimum stock, or status..."
              className="h-11 w-full rounded-[12px] border border-[#cddcf2] bg-white pl-11 pr-4 text-[14px] text-[#111827] outline-none placeholder:text-[#98a2b3] focus:border-[#93b4ff]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={materialFilter}
                onChange={(event) => setMaterialFilter(event.target.value)}
                className="h-10 appearance-none rounded-[8px] border border-[#cfd5dd] bg-[#d9d9d9] px-5 pr-10 text-[13px] font-medium text-[#666] outline-none focus:border-[#93b4ff]"
              >
                <option value="All">Material production</option>
                <option value="Material production">Low stock</option>
                <option value="Available stock">Enough stock</option>
              </select>

              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#666]">
                <ChevronIcon />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[18px] border border-[#dfe5ef] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#f9fafb]">
                  {["ID", "Product Name", "Current stock", "Minimum stock", "Status"].map(
                    (header) => (
                      <th
                        key={header}
                        className="border-b border-[#e4e7ec] px-4 py-4 text-left text-[13px] font-semibold text-[#475467] first:rounded-tl-[18px] last:rounded-tr-[18px]"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
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
                          statusChipClass(item.status),
                        ].join(" ")}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-10 text-center text-[14px] text-[#667085]"
                    >
                      No inventory items found for this search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </section>

      <TableImportDialog
        title="Import Inventory Data"
        columns={inventoryImportColumns}
        isOpen={isImportDialogOpen}
        isLoading={isImportLoading}
        errorMessage={importErrorMessage}
        fileName={importFileName}
        preview={importPreview}
        onClose={closeImportDialog}
        onConfirm={confirmImport}
      />
    </>
  );
}
