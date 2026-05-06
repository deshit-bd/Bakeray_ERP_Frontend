"use client";

import { useEffect, useMemo, useState } from "react";
import {
  defaultOrders,
  defaultPurchases,
  PURCHASE_STORAGE_KEY,
  purchaseTypes,
  readPurchases,
  savePurchases,
} from "../utils/purchaseStore";
import {
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";
import {
  initialSuppliers,
  readSuppliers,
  subscribeSuppliers,
  supplierTypeToPurchaseType,
} from "../utils/supplierStore";
import { resolveProductBarcode } from "../utils/barcode";

export { defaultOrders, defaultPurchases, PURCHASE_STORAGE_KEY };

function formatTaka(amount) {
  return (
    <>
      <span className="currency-symbol">৳</span>
      {Number(amount || 0).toLocaleString("en-US")}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#a9afbd]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function typeChipClass(type) {
  if (type === "Bought Mix") return "bg-[#f3dcff] text-[#7e22ce]";
  if (type === "Outside Product") return "bg-[#dcfce7] text-[#16a34a]";
  return "bg-[#dbeafe] text-[#2563eb]";
}

function createEmptyForm(unit = "kg", supplier = "", type = "Raw Material") {
  return {
    supplier,
    type,
    product: "",
    quantity: "0",
    unit,
    cost: "0",
    sellingPricePerUnit: "",
    barcode: "",
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function PurchaseManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const unitOptions = useMemo(
    () => (settings.units && settings.units.length > 0 ? settings.units : ["kg"]),
    [settings.units]
  );
  const defaultUnit = unitOptions[0] || "kg";
  const supplierOptions = useMemo(() => {
    const activeSuppliers = suppliers.filter((supplier) => supplier.status !== "Inactive");
    return activeSuppliers.length > 0 ? activeSuppliers : suppliers;
  }, [suppliers]);
  const defaultSupplier = supplierOptions[0] || null;
  const defaultSupplierName = defaultSupplier?.supplierName || "";
  const defaultPurchaseType = supplierTypeToPurchaseType(defaultSupplier?.type);
  const [formData, setFormData] = useState(() =>
    createEmptyForm(defaultUnit, defaultSupplierName, defaultPurchaseType)
  );

  useEffect(() => {
    setPurchases(readPurchases());
    setSuppliers(readSuppliers());
    setIsStorageReady(true);
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);
  useEffect(() => subscribeSuppliers(setSuppliers), []);

  useEffect(() => {
    setFormData((current) =>
      unitOptions.includes(current.unit) ? current : { ...current, unit: defaultUnit }
    );
  }, [defaultUnit, unitOptions]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    savePurchases(purchases);
  }, [purchases, isStorageReady]);

  useEffect(() => {
    setFormData((current) => {
      if (supplierOptions.some((supplier) => supplier.supplierName === current.supplier)) {
        return current;
      }

      return createEmptyForm(defaultUnit, defaultSupplierName, defaultPurchaseType);
    });
  }, [defaultPurchaseType, defaultSupplierName, defaultUnit, supplierOptions]);

  const rows = useMemo(() => purchases, [purchases]);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(createEmptyForm(defaultUnit, defaultSupplierName, defaultPurchaseType));
  };

  const updateField = (field, value) => {
    setFormData((current) => {
      if (field !== "supplier") return { ...current, [field]: value };

      const selectedSupplier = supplierOptions.find((supplier) => supplier.supplierName === value);
      return {
        ...current,
        supplier: value,
        type: supplierTypeToPurchaseType(selectedSupplier?.type),
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.supplier.trim() || !formData.product.trim()) return;

    const nextNumber =
      purchases.reduce((max, item) => {
        const number = Number(String(item.id || "").replace("PUR-", ""));
        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, 0) + 1;

    const generatedBarcode = formData.type === "Outside Product"
      ? resolveProductBarcode({ productName: formData.product.trim(), packetSize: formData.unit || "pcs", type: "Outside Product", barcode: formData.barcode })
      : "";

    const nextPurchase = {
      id: `PUR-${String(nextNumber).padStart(3, "0")}`,
      date: todayDate(),
      supplier: formData.supplier.trim(),
      product: formData.product.trim(),
      type: formData.type,
      quantity: Number(formData.quantity || 0),
      unit: formData.unit || defaultUnit,
      cost: Number(formData.cost || 0),
      sellingPricePerUnit: Number(formData.sellingPricePerUnit || 0),
      barcode: generatedBarcode,
    };

    setPurchases((current) => [nextPurchase, ...current]);
    closeModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-5 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#0f172a]">Purchase</h1>
              <p className="mt-2 text-[20px] leading-6 text-[#64748b]">Track all purchase transactions</p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-[45px] items-center justify-center gap-3 rounded-[8px] bg-[#523cf0] px-6 text-[16px] font-semibold text-white shadow-[0_10px_24px_rgba(82,60,240,0.2)] transition hover:bg-[#4632df]"
            >
              <PlusIcon />
              <span>New Purchase</span>
            </button>
          </div>

          <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white p-7 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Purchase History</h2>

            <div className="mt-9 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Date</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Supplier</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Product</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Type</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Quantity</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Unit</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Barcode</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-4 text-[18px] font-semibold text-[#171717]">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-[#e5e7eb] last:border-b-0">
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] text-[#171717]">{purchase.date}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] font-semibold text-[#171717]">{purchase.supplier}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] text-[#171717]">{purchase.product}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4">
                        <span className={`inline-flex rounded-[8px] px-3 py-1 text-[14px] font-semibold ${typeChipClass(purchase.type)}`}>
                          {purchase.type}
                        </span>
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] text-[#171717]">{purchase.quantity}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] text-[#171717]">{purchase.unit || "kg"}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[15px] font-mono text-[#171717]">{purchase.barcode || "-"}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] font-semibold text-[#171717]">{formatTaka(purchase.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.30)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">Record New Purchase</h2>
                <p className="mt-3 text-[18px] text-[#727789]">Enter purchase details below</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Supplier</span>
                <div className="relative">
                  <select
                    value={formData.supplier}
                    onChange={(event) => updateField("supplier", event.target.value)}
                    className="h-[46px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f4] px-4 pr-11 text-[18px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
                  >
                    {supplierOptions.map((supplier) => (
                      <option key={supplier.id || supplier.supplierName} value={supplier.supplierName}>
                        {supplier.supplierName} - {supplier.type}
                      </option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Purchase Type</span>
                <div className="relative">
                  <select
                    value={formData.type}
                    onChange={(event) => updateField("type", event.target.value)}
                    className="h-[46px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f4] px-4 pr-11 text-[18px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
                  >
                    {purchaseTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronIcon />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Product Name</span>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(event) => updateField("product", event.target.value)}
                  placeholder="Enter product name"
                  className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#777d90] focus:ring-2 focus:ring-[#523cf0]/25"
                />
              </label>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Quantity</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(event) => updateField("quantity", event.target.value)}
                    placeholder="0"
                    className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#777d90] focus:ring-2 focus:ring-[#523cf0]/25"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Unit</span>
                  <div className="relative">
                    <select
                      value={formData.unit}
                      onChange={(event) => updateField("unit", event.target.value)}
                      className="h-[46px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f4] px-4 pr-11 text-[18px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <ChevronIcon />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Total Cost (৳)</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.cost}
                    onChange={(event) => updateField("cost", event.target.value)}
                    placeholder="0"
                    className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#777d90] focus:ring-2 focus:ring-[#523cf0]/25"
                  />
                </label>
              </div>

              {formData.type === "Outside Product" ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Selling Price / Unit (৳)</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.sellingPricePerUnit}
                      onChange={(event) => updateField("sellingPricePerUnit", event.target.value)}
                      placeholder="Selling price"
                      className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#777d90] focus:ring-2 focus:ring-[#523cf0]/25"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[18px] font-semibold text-[#171717]">Barcode</span>
                    <input
                      type="text"
                      value={formData.barcode || resolveProductBarcode({ productName: formData.product, packetSize: formData.unit || "pcs", type: "Outside Product" })}
                      onChange={(event) => updateField("barcode", event.target.value)}
                      placeholder="Scan/type or auto-generated"
                      className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 font-mono text-[18px] text-[#171717] outline-none placeholder:text-[#777d90] focus:ring-2 focus:ring-[#523cf0]/25"
                    />
                  </label>
                </div>
              ) : null}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="h-[46px] rounded-[8px] bg-[#523cf0] px-6 text-[17px] font-semibold text-white transition hover:bg-[#4632df]"
                >
                  Record Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
