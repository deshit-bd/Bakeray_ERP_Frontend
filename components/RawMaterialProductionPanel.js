"use client";

import { useEffect, useMemo, useState } from "react";
import TableImportDialog from "./LazyTableImportDialog";
import { useTableImport } from "../hooks/useTableImport";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getNextPrefixedId, inferStockStatus } from "../utils/tableImport";

const stockTabs = ["Raw Material Stock", "Production"];
const materialOptions = ["Sugar", "Oil", "Water", "Milk Powder", "Flavor"];
const unitOptions = ["kg", "L", "pcs", "gm"];
export const RAW_STOCK_STORAGE_KEY = "erp-raw-material-stock";
export const RAW_PRODUCTION_STORAGE_KEY = "erp-raw-material-production";

export const rawMaterialStock = [];

export const initialRawMaterialProductionRows = [];

const rawStockImportColumns = [
  { key: "id", label: "ID", required: false },
  { key: "materialName", label: "Material Name", aliases: ["Name", "Item Name"] },
  { key: "currentStock", label: "Current Stock", aliases: ["Stock", "Quantity", "Qty"] },
  { key: "minimumStock", label: "Minimum Stock", aliases: ["Min Stock", "Reorder Level"] },
  { key: "status", label: "Status", required: false },
];

const rawProductionImportColumns = [
  { key: "id", label: "ID", required: false },
  { key: "materialName", label: "Material Name", aliases: ["Materials", "Raw Material"] },
  { key: "productionName", label: "Manufacturing Production Name", aliases: ["Production Name", "Product Name"] },
  { key: "status", label: "Status", required: false },
  { key: "actions", label: "Actions", required: false },
];

const emptyProductionItem = {
  material: "Sugar",
  quantity: "1",
  unit: "kg",
};

const emptyProductionForm = {
  id: "",
  productionName: "",
  items: [emptyProductionItem],
};

function cloneEmptyItem() {
  return {
    material: "Sugar",
    quantity: "1",
    unit: "kg",
  };
}

function createEmptyProductionForm() {
  return {
    id: "",
    productionName: "",
    items: [cloneEmptyItem()],
  };
}

function parseMaterialItems(materialName) {
  if (!materialName) {
    return [cloneEmptyItem()];
  }

  const parsedItems = materialName
    .split(" , ")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [materialPart, amountPart] = segment.split("/").map((part) => part.trim());
      const [quantity = "1", unit = "kg"] = (amountPart || "").split(" ");

      return {
        material: materialPart || "Sugar",
        quantity: quantity || "1",
        unit: unit || "kg",
      };
    });

  return parsedItems.length > 0 ? parsedItems : [cloneEmptyItem()];
}

function formatMaterialDisplay(materialName) {
  return parseMaterialItems(materialName).map((item) => ({
    name: item.material,
    quantity: `${item.quantity} ${item.unit}`,
  }));
}

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

function stockStatusChipClass(status) {
  if (status === "enough") {
    return "bg-[#dcfce7] text-[#16a34a]";
  }

  return "bg-[#ffedd5] text-[#f97316]";
}

function productionStatusChipClass(status) {
  if (status === "Completed") {
    return "bg-[#dcfce7] text-[#16a34a]";
  }

  return "bg-[#fff1e8] text-[#f97316]";
}

export default function RawMaterialProductionPanel() {
  const [activeStockTab, setActiveStockTab] = useState("Raw Material Stock");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRow, setViewingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const [stockRows, setStockRows] = useState(rawMaterialStock);
  const [productionRows, setProductionRows] = useState(initialRawMaterialProductionRows);
  const [productionForm, setProductionForm] = useState(createEmptyProductionForm);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedStock = window.localStorage.getItem(RAW_STOCK_STORAGE_KEY);
      if (storedStock) {
        const parsedStock = JSON.parse(storedStock);
        if (Array.isArray(parsedStock)) setStockRows(parsedStock);
      }
      const storedProduction = window.localStorage.getItem(RAW_PRODUCTION_STORAGE_KEY);
      if (storedProduction) {
        const parsedProduction = JSON.parse(storedProduction);
        if (Array.isArray(parsedProduction)) setProductionRows(parsedProduction);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(RAW_STOCK_STORAGE_KEY, JSON.stringify(stockRows));
  }, [stockRows]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(RAW_PRODUCTION_STORAGE_KEY, JSON.stringify(productionRows));
  }, [productionRows]);

  const filteredStock = useMemo(() => {
    return stockRows.filter((item) =>
      [item.id, item.materialName, item.currentStock, item.minimumStock, item.status]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase())
    );
  }, [stockRows, debouncedSearchQuery]);

  const filteredProduction = useMemo(() => {
    return productionRows.filter((item) =>
      [item.id, item.materialName, item.productionName, item.productionQuantity, item.beforeQuantity, item.afterQuantity, item.status]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase())
    );
  }, [productionRows, debouncedSearchQuery]);

  const isProductionView = activeStockTab === "Production";


  const stockImport = useTableImport({
    columns: rawStockImportColumns,
    existingRows: stockRows,
    transformRow: (row, { index, existingRows }) => {
      const nextRow = {
        id: row.id || getNextPrefixedId(existingRows, "RP", "id", index),
        materialName: row.materialName || "",
        currentStock: row.currentStock || "0",
        minimumStock: row.minimumStock || "0",
      };
      return { ...nextRow, status: inferStockStatus(nextRow) };
    },
    onApply: setStockRows,
  });

  const productionImport = useTableImport({
    columns: rawProductionImportColumns,
    existingRows: productionRows,
    transformRow: (row, { index, existingRows }) => ({
      id: row.id || getNextPrefixedId(existingRows, "RP", "id", index),
      materialName: row.materialName || "",
      productionName: row.productionName || "",
      status: row.status || "Pending",
    }),
    onApply: setProductionRows,
  });

  const activeImport = isProductionView ? productionImport : stockImport;

  const closeModal = () => {
    setIsModalOpen(false);
    setProductionForm(createEmptyProductionForm());
  };

  const handleProductionNameChange = (event) => {
    const { value } = event.target;
    setProductionForm((current) => ({ ...current, productionName: value }));
  };

  const handleItemChange = (index, field, value) => {
    setProductionForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = () => {
    setProductionForm((current) => ({
      ...current,
      items: [...current.items, cloneEmptyItem()],
    }));
  };

  const handleRemoveItem = (index) => {
    setProductionForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleAddProduction = (event) => {
    event.preventDefault();

    const productionName = productionForm.productionName.trim();
    if (!productionName) {
      return;
    }

    const materialName = productionForm.items
      .map((item) => `${item.material} / ${item.quantity} ${item.unit}`)
      .join(" , ");

    if (productionForm.id) {
      setProductionRows((current) =>
        current.map((item) =>
          item.id === productionForm.id
            ? {
                ...item,
                materialName,
                productionName,
              }
            : item
        )
      );
      closeModal();
      return;
    }

    const nextIdNumber =
      productionRows.reduce((maxId, item) => {
        const numericId = Number(item.id.replace("RP-", ""));
        return Number.isNaN(numericId) ? maxId : Math.max(maxId, numericId);
      }, 0) + 1;
    const nextRow = {
      id: `RP-${String(nextIdNumber).padStart(3, "0")}`,
      materialName,
      productionName,
      status: "Pending",
    };

    setProductionRows((current) => [nextRow, ...current]);
    closeModal();
    setActiveStockTab("Production");
  };

  const handleComplete = (id) => {
    setProductionRows((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Completed" } : item
      )
    );
  };

  const handleEdit = (row) => {
    setProductionForm({
      id: row.id,
      productionName: row.productionName,
      items: parseMaterialItems(row.materialName),
    });
    setIsModalOpen(true);
  };

  const handleView = (row) => {
    setViewingRow(row);
  };

  const handleDelete = (row) => {
    setDeletingRow(row);
  };

  const confirmDelete = () => {
    if (!deletingRow) {
      return;
    }

    setProductionRows((current) =>
      current.filter((item) => item.id !== deletingRow.id)
    );
    setDeletingRow(null);
  };

  return (
    <>
      <TableImportDialog
        title={isProductionView ? "Import Raw Material Production Data" : "Import Raw Material Stock Data"}
        columns={isProductionView ? rawProductionImportColumns : rawStockImportColumns}
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
              const active = activeStockTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveStockTab(tab)}
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#cdd8ea] bg-white px-4 text-[14px] font-medium text-[#344054] transition hover:bg-[#f8fbff]"
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

            {isProductionView ? (
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
              isProductionView
                ? "Search by production ID, product name, quantity, status, or stock..."
                : "Search by stock ID, product name, current stock, minimum stock, or status..."
            }
            className="h-12 w-full rounded-[12px] border border-[#c9d4e5] bg-white pl-11 pr-4 text-[14px] text-[#344054] outline-none placeholder:text-[#98a2b3] focus:border-[#9db3de]"
          />
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[#dfe5ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            {isProductionView ? (
              <table className="min-w-[980px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    {[
                      "ID",
                      "Material Name",
                      "Manufacturing Production Name",
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
                        {item.materialName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] text-[#344054]">
                        {item.productionName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-[12px] font-medium",
                            productionStatusChipClass(item.status),
                          ].join(" ")}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(item)}
                            className="inline-flex h-8 items-center justify-center rounded-[6px] border border-[#d0d5dd] bg-white px-3 text-[12px] font-medium text-[#111827] hover:bg-[#f8fafc]"
                          >
                            View
                          </button>
                          {item.status !== "Completed" ? (
                            <button
                              type="button"
                              onClick={() => handleComplete(item.id)}
                              className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#2d30ff] px-3 text-[12px] font-medium text-white hover:bg-[#2326e6]"
                            >
                              Complete
                            </button>
                          ) : null}
                        </div>
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
                        No raw material production found for this search.
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
                      "Material Name",
                      "Current Stock",
                      "Minimum Stock",
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
                        {item.materialName}
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
                            stockStatusChipClass(item.status),
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
                        No raw material stock found for this search.
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
        <div className="w-full max-w-[700px] rounded-[24px] bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-semibold text-[#181d27] sm:text-[20px]">
                {productionForm.id
                  ? "Edit Manufacturing Production Name"
                  : "Add Manufacturing Production Name"}
              </h3>
            </div>

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
                Manufacturing Production Name
              </span>
              <input
                type="text"
                value={productionForm.productionName}
                onChange={handleProductionNameChange}
                placeholder="Enter name"
                className="h-11 w-full rounded-[14px] border border-[#d9e2ef] px-4 text-[15px] text-[#181d27] outline-none placeholder:text-[#98a2b3] focus:border-[#2f66e3]"
                required
              />
            </label>

            <div className="mt-5 flex items-center justify-between gap-3">
              <h4 className="text-[16px] font-semibold text-[#181d27]">Items</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#12b76a] px-4 text-[14px] font-medium text-white transition hover:bg-[#0fa968]"
              >
                <PlusIcon />
                Add Item
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-[16px] border border-[#e4e7ec]">
              <div className="grid grid-cols-[minmax(0,1.5fr)_110px_110px_50px] gap-4 bg-[#f8fafc] px-4 py-3 text-[14px] font-semibold text-[#475467]">
                <span>Material</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span />
              </div>

              <div className="divide-y divide-[#eaecf0] bg-white">
                {productionForm.items.map((item, index) => (
                  <div
                    key={`${index}-${item.material}-${item.unit}`}
                    className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.5fr)_110px_110px_50px] sm:items-center"
                  >
                    <select
                      value={item.material}
                      onChange={(event) =>
                        handleItemChange(index, "material", event.target.value)
                      }
                      className="h-11 rounded-[12px] border border-[#d9e2ef] bg-white px-4 text-[14px] text-[#344054] outline-none focus:border-[#2f66e3]"
                    >
                      {materialOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, "quantity", event.target.value)
                      }
                      className="h-11 rounded-[12px] border border-[#d9e2ef] px-4 text-[14px] text-[#344054] outline-none focus:border-[#2f66e3]"
                      required
                    />

                    <select
                      value={item.unit}
                      onChange={(event) =>
                        handleItemChange(index, "unit", event.target.value)
                      }
                      className="h-11 rounded-[12px] border border-[#d9e2ef] bg-white px-4 text-[14px] text-[#344054] outline-none focus:border-[#2f66e3]"
                    >
                      {unitOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={productionForm.items.length === 1}
                      className={[
                        "inline-flex h-10 w-10 items-center justify-center rounded-full text-[#ef4444] transition hover:bg-[#fef2f2]",
                        productionForm.items.length === 1
                          ? "cursor-not-allowed opacity-40"
                          : "",
                      ].join(" ")}
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

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
                {productionForm.id ? "Edit and save" : "Add For Production"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/35 p-4 backdrop-blur-[2px] transition",
          viewingRow ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[560px] rounded-[14px] border border-[#dfe5ef] bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4 px-1 pb-3 pt-1">
            <div>
              <h3 className="text-[16px] font-medium text-[#111827]">View Items</h3>
            </div>

            <button
              type="button"
              onClick={() => setViewingRow(null)}
              className="grid h-8 w-8 place-items-center rounded-full text-[#344054] transition hover:bg-[#f8fafc]"
              aria-label="Close invoice"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="overflow-hidden rounded-[12px] border border-[#e4e7ec]">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#f8fafc]">
                  {["Items name", "Quantity"].map((header) => (
                    <th
                      key={header}
                      className="border-b border-[#eaecf0] px-4 py-3 text-left text-[12px] font-medium text-[#667085]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(viewingRow ? formatMaterialDisplay(viewingRow.materialName) : []).map(
                  (item, index) => (
                    <tr key={`${item.name}-${item.quantity}-${index}`} className="bg-white">
                      <td className="border-b border-[#eaecf0] px-4 py-3 text-[13px] text-[#111827] last:border-b-0">
                        {item.name}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-3 text-[13px] text-[#111827] last:border-b-0">
                        {item.quantity}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
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
              Are You sure Delete this Manufacture
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
