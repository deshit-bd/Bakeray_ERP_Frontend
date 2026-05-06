"use client";

import { useEffect, useMemo, useState } from "react";
import { flushDbKey } from "../lib/apiSync";
import { readSuppliers, subscribeSuppliers } from "../utils/supplierStore";
import {
  getDefaultPacketSize,
  getPacketSizeOptions,
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";

const STORAGE_KEY = "erp-outside-products";
const BDT_SYMBOL = "\u09F3";

const supplierOptions = [];

const defaultProducts = [];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US")}`;
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

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function SelectMenu({ value, options, onChange }) {
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
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[8px] bg-white p-[6px] shadow-[0_6px_18px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
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

function isLegacyDefaultProducts(items) {
  return (
    items.length === 3 &&
    items[0]?.id === "OP-001" &&
    items[0]?.product === "Cookies Pack (12pcs)" &&
    items[1]?.product === "Biscuits Box" &&
    items[2]?.product === "Bread Loaf"
  );
}

function normalizeProduct(item, index) {
  return {
    id: item.id || `OP-${index + 1}`,
    date: item.date || todayDate(),
    product: item.product || item.productName || "",
    supplier: item.supplier || "",
    packetSize: item.packetSize || "1kg",
    quantity: Number(item.quantity || 0),
    costPerUnit: Number(item.costPerUnit || item.cost || 0),
    sellingPricePerUnit: Number(item.sellingPricePerUnit || item.sellingPrice || 0),
  };
}

function loadProducts() {
  if (typeof window === "undefined") return defaultProducts;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultProducts;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaultProducts;
    if (isLegacyDefaultProducts(parsed)) return defaultProducts;

    return parsed.map(normalizeProduct);
  } catch {
    return defaultProducts;
  }
}

function createEmptyForm(packetSize = "1kg") {
  return {
    product: "",
    supplier: "",
    packetSize,
    quantity: "0",
    costPerUnit: "0",
    sellingPricePerUnit: "0",
  };
}

export default function OutsideProductManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [products, setProducts] = useState(defaultProducts);
  const [suppliers, setSuppliers] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(() =>
    createEmptyForm(getDefaultPacketSize(readSystemSettings()).label)
  );

  const packetSizeOptions = useMemo(
    () => getPacketSizeOptions(settings).map((packet) => packet.label),
    [settings]
  );
  const dynamicSupplierOptions = useMemo(
    () => suppliers.map((supplier) => supplier.supplierName || supplier.name).filter(Boolean),
    [suppliers]
  );
  const defaultPacket = useMemo(() => getDefaultPacketSize(settings), [settings]);

  useEffect(() => {
    setProducts(loadProducts());
    setSuppliers(readSuppliers());
    setIsStorageReady(true);
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);
  useEffect(() => subscribeSuppliers(setSuppliers), []);

  useEffect(() => {
    if (!packetSizeOptions.includes(form.packetSize)) {
      setForm((current) => ({ ...current, packetSize: defaultPacket.label }));
    }
  }, [defaultPacket.label, form.packetSize, packetSizeOptions]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products, isStorageReady]);

  const totalValue = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.costPerUnit || 0),
        0
      ),
    [products]
  );

  const canSave = useMemo(() => {
    return (
      form.product.trim() &&
      form.supplier &&
      Number(form.quantity) > 0 &&
      Number(form.costPerUnit) > 0 &&
      Number(form.sellingPricePerUnit) >= 0
    );
  }, [form]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openModal = () => {
    setForm(createEmptyForm(defaultPacket.label));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(createEmptyForm(defaultPacket.label));
  };

  const handleAddProduct = (event) => {
    event.preventDefault();
    if (!canSave) return;

    const nextProduct = {
      id: `OP-${Date.now()}`,
      date: todayDate(),
      product: form.product.trim(),
      supplier: form.supplier,
      packetSize: form.packetSize,
      quantity: Number(form.quantity),
      costPerUnit: Number(form.costPerUnit),
      sellingPricePerUnit: Number(form.sellingPricePerUnit || 0),
    };

    const nextProducts = [nextProduct, ...products];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProducts));
      flushDbKey(STORAGE_KEY).catch(() => {});
    }
    setProducts(nextProducts);
    closeModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
              Outside Product
            </h1>
            <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
              Manage products purchased from external suppliers
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="rounded-[16px] border border-[#dde2ea] bg-white px-8 py-9 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[18px] font-semibold text-[#4b5c78]">Total Products</p>
              <p className="mt-12 text-[31px] font-bold leading-none text-[#0b0b0d]">
                {products.length.toLocaleString("en-US")}
              </p>
            </article>

            <article className="rounded-[16px] border border-[#dde2ea] bg-white px-8 py-9 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[18px] font-semibold text-[#4b5c78]">Total Value</p>
              <p className="mt-12 text-[31px] font-bold leading-none text-[#0b0b0d]">
                {formatMoney(totalValue)}
              </p>
            </article>
          </div>

          <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[20px] font-semibold text-[#171717]">
                Outside Products Inventory
              </h2>

              <button
                type="button"
                onClick={openModal}
                className="inline-flex h-[45px] items-center justify-center gap-5 rounded-[8px] bg-[#523cf0] px-5 text-[17px] font-semibold text-white transition hover:bg-[#4632df]"
              >
                <PlusIcon />
                <span>Add Product</span>
              </button>
            </div>

            <div className="mt-[40px] overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Date
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Product Name
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Supplier
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Quantity
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Cost/Unit
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => {
                    const itemTotal = Number(item.quantity || 0) * Number(item.costPerUnit || 0);

                    return (
                      <tr key={item.id}>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] text-[#171717]">
                          {item.date}
                        </td>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                          {item.product}
                        </td>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] text-[#171717]">
                          {item.supplier}
                        </td>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] font-semibold text-[#171717]">
                          {Number(item.quantity || 0).toLocaleString("en-US")} pcs
                        </td>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] text-[#171717]">
                          {formatMoney(item.costPerUnit)}
                        </td>
                        <td className="border-b border-[#edf2f7] px-3 py-[13px] text-[18px] font-bold text-[#009b3f]">
                          {formatMoney(itemTotal)}
                        </td>
                      </tr>
                    );
                  })}

                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                        No outside product found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-1">
          <div className="my-1 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">
                  Add Outside Product
                </h2>
                <p className="mt-3 text-[18px] text-[#727789]">
                  Purchase product from external supplier
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-5 space-y-[18px]">
              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Product Name
                </span>
                <input
                  type="text"
                  value={form.product}
                  onChange={(event) => updateField("product", event.target.value)}
                  placeholder="Enter product name"
                  autoFocus
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d9d9d]/70"
                />
              </label>

              <div className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Supplier
                </span>
                <SelectMenu
                  value={form.supplier}
                  options={dynamicSupplierOptions}
                  onChange={(value) => updateField("supplier", value)}
                />
              </div>

              <div className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Packet Size
                </span>
                <SelectMenu
                  value={form.packetSize}
                  options={packetSizeOptions}
                  onChange={(value) => updateField("packetSize", value)}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                    Quantity (pcs)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(event) => updateField("quantity", event.target.value)}
                    placeholder="0"
                    className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                    Cost/Unit ({BDT_SYMBOL})
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.costPerUnit}
                    onChange={(event) => updateField("costPerUnit", event.target.value)}
                    placeholder="0"
                    className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Selling Price/Unit ({BDT_SYMBOL})
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.sellingPricePerUnit}
                  onChange={(event) => updateField("sellingPricePerUnit", event.target.value)}
                  placeholder="0"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!canSave}
                  className={`h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition ${
                    canSave ? "hover:bg-[#4632df]" : "cursor-not-allowed opacity-70"
                  }`}
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
