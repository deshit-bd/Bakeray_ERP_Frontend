"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readFinishedInventoryRows } from "../utils/finishedStockStore";
import { subscribePurchases } from "../utils/purchaseStore";
import { readSystemSettings, subscribeSystemSettings } from "../utils/systemSettings";
import { flushDbKey } from "../lib/apiSync";

export const CUSTOMER_ORDERS_STORAGE_KEY = "erp-customer-orders";
export const SALES_STORAGE_KEY = "erp-sales-rows";
export const INVOICES_STORAGE_KEY = "erp-invoice-rows";

const BDT_SYMBOL = "\u09F3";
const CUSTOMERS_STORAGE_KEY = "erp-customers";

const fallbackCustomers = [];

const defaultProducts = [];

export const salesRows = [];

export const invoiceRows = [];

export const fallbackCustomerOrders = [];

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMoney(value) {
  return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;
}

function formatMoneyValue(value) {
  return normalizeMoney(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatMoney(value) {
  return `${BDT_SYMBOL}${formatMoneyValue(value)}`;
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}


function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}

function productLabel(product) {
  return `${product.name} (${product.packetSize}) - Stock: ${Number(product.stock || 0).toLocaleString(
    "en-US"
  )} - ${formatMoney(product.price)}`;
}

function normalizeSaleType(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("retail") ? "Retail" : "Wholesale";
}

function normalizeProduct(row, index) {
  const name = row.productName || row.product || row.name || "Finished Product";
  const packetSize = row.packetSize || row.size || "1kg";

  return {
    id: row.id || `FIN-${index + 1}`,
    name,
    packetSize,
    stock: safeNumber(row.quantity || row.stock || row.totalPackets),
    price: safeNumber(row.pricePerUnit || row.pricePerPacket || row.sellingPricePerUnit),
  };
}

function aggregateProducts(rows) {
  const productByKey = new Map();

  rows.forEach((row) => {
    const key = `${row.name}-${row.packetSize}`.toLowerCase();
    const current = productByKey.get(key) || {
      ...row,
      id: key,
      stock: 0,
      price: 0,
    };

    productByKey.set(key, {
      ...current,
      stock: Number(current.stock || 0) + Number(row.stock || 0),
      price: Number(row.price || 0) || Number(current.price || 0),
    });
  });

  return Array.from(productByKey.values());
}

function loadProducts() {
  const storedProducts = readFinishedInventoryRows({ includeDefaults: true })
    .map(normalizeProduct)
    .filter((product) => product.stock > 0 && product.price > 0);

  return aggregateProducts(storedProducts);
}

function normalizeCustomer(row, index) {
  const name = row.customerName || row.companyName || row.name || `Customer ${index + 1}`;

  return {
    id: row.id || `CUS-${index + 1}`,
    name,
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    type: normalizeSaleType(row.type || row.customerCategory),
  };
}

function normalizeCustomerKey(value) {
  return String(value || "").trim().toLowerCase();
}

function customerKeyFromSale(sale = {}) {
  return normalizeCustomerKey(sale.customerId || sale.customerName || sale.companyName || sale.customer);
}

function customerKeyFromCustomer(customer = {}) {
  return normalizeCustomerKey(customer.id || customer.name || customer.customerName || customer.companyName);
}

function calculatePreviousDueForCustomer(customer, invoices = []) {
  const customerId = normalizeCustomerKey(customer?.id);
  const customerName = normalizeCustomerKey(customer?.name || customer?.customerName || customer?.companyName);

  if (!customerId && !customerName) return 0;

  return normalizeMoney(
    invoices.reduce((sum, sale) => {
      const saleCustomerId = normalizeCustomerKey(sale.customerId);
      const saleCustomerName = normalizeCustomerKey(sale.customerName || sale.companyName || sale.customer);
      const isSameCustomer =
        (customerId && saleCustomerId && customerId === saleCustomerId) ||
        (customerName && saleCustomerName && customerName === saleCustomerName) ||
        customerKeyFromSale(sale) === customerKeyFromCustomer(customer);

      return isSameCustomer ? sum + safeNumber(sale.balanceDue) : sum;
    }, 0)
  );
}

function loadCustomers() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    const imported = parsed.map(normalizeCustomer);
    const seen = new Set();

    return imported.filter((customer) => {
      const key = `${customer.name}-${customer.phone}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

function isLegacyDefaultInvoices(rows) {
  return (
    rows.length === 3 &&
    rows[0]?.id === "IN-001" &&
    rows[0]?.invoiceDate === "2026-04-10" &&
    Number(rows[0]?.total || 0) === 60000
  );
}

function normalizeInvoice(row, index) {
  const total = safeNumber(row.total || row.totalBill || row.amount);
  const paid = safeNumber(row.paid || row.getAmount || row.receivedAmount);
  const previousDue = safeNumber(row.previousDue || row.previousBalance || row.openingDue);
  const balanceDue =
    row.balanceDue !== undefined || row.due !== undefined
      ? safeNumber(row.balanceDue ?? row.due)
      : Math.max(total - paid, 0);
  const description = Array.isArray(row.description) ? row.description : [];
  const date = row.invoiceDate || row.date || todayDate();
  const invoiceNo = row.invoiceNo || row.id || `INV-${String(index + 1).padStart(3, "0")}`;
  const customerName = row.customerName || row.companyName || row.customer || "Walk-in Customer";

  return {
    id: invoiceNo,
    invoiceNo,
    invoiceDate: date,
    date,
    customerId: row.customerId || "",
    companyName: customerName,
    customerName,
    customerCategory: normalizeSaleType(row.saleType || row.type || row.customerCategory),
    saleType: normalizeSaleType(row.saleType || row.type || row.customerCategory),
    customerPhone: row.customerPhone || row.phone || "",
    customerEmail: row.customerEmail || row.email || "",
    customerAddress: row.customerAddress || row.address || "",
    source: row.source || "",
    items: safeNumber(row.items) || description.length || 1,
    status: row.status || (balanceDue <= 0 ? "Paid" : "Partial"),
    description,
    subtotal: safeNumber(row.subtotal || total),
    discount: safeNumber(row.discount),
    tax: safeNumber(row.tax),
    total,
    paid,
    previousDue,
    balanceDue,
    totalDue: safeNumber(row.totalDue) || previousDue + balanceDue,
  };
}

function loadInvoices() {
  if (typeof window === "undefined") return invoiceRows;

  try {
    const stored = window.localStorage.getItem(INVOICES_STORAGE_KEY);
    if (!stored) return invoiceRows;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return invoiceRows;
    if (isLegacyDefaultInvoices(parsed)) return invoiceRows;

    return parsed.map(normalizeInvoice);
  } catch {
    return invoiceRows;
  }
}

function loadSalesRows() {
  if (typeof window === "undefined") return salesRows;

  try {
    const stored = window.localStorage.getItem(SALES_STORAGE_KEY);
    if (!stored) return salesRows;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : salesRows;
  } catch {
    return salesRows;
  }
}

function nextInvoiceNo(rows) {
  const maxNumber = rows.reduce((max, row) => {
    const matched = String(row.invoiceNo || row.id || "").match(/(\d+)$/);
    return matched ? Math.max(max, Number(matched[1])) : max;
  }, 0);

  return `INV-${String(maxNumber + 1).padStart(3, "0")}`;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#00b050] text-[30px] font-medium leading-none text-white">
      $
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#9aa1ae]"
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

function FormSelect({ label, placeholder, value, options, onChange, formatOption }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <label
      className="relative block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      {label ? (
        <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[45px] w-full items-center justify-between rounded-[9px] bg-[#f0f0f3] px-4 text-left text-[18px] font-semibold text-[#171717] outline-none transition focus:ring-2 focus:ring-[#9d8df4]/30"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selected ? "min-w-0 truncate" : "min-w-0 truncate text-[#74798a]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronIcon />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-[8px] bg-white p-[6px] shadow-[0_6px_18px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-[40px] w-full items-center justify-between rounded-[8px] px-3 py-2 text-left text-[18px] text-[#171717] transition ${
                  isSelected ? "bg-[#e7e9ee]" : "hover:bg-[#f4f5f8]"
                }`}
              >
                <span className="min-w-0 truncate">
                  {formatOption ? formatOption(option.raw) : option.label}
                </span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </label>
  );
}

function TypeChip({ type }) {
  const isRetail = type === "Retail";

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[16px] font-semibold leading-none",
        isRetail ? "bg-[#d7fbe3] text-[#008c3b]" : "bg-[#e4e3ff] text-[#3324ef]",
      ].join(" ")}
    >
      {type}
    </span>
  );
}

function SourceChip({ source }) {
  if (!source) return null;

  return (
    <span className="inline-flex rounded-full bg-[#dbeafe] px-3 py-1 text-[16px] font-semibold leading-none text-[#1d4fff]">
      {source}
    </span>
  );
}


function CustomerQuickAddModal({ form, onChange, onClose, onSubmit }) {
  const canSave = String(form.name || "").trim();
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-6">
      <div className="w-full max-w-[640px] rounded-[10px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">Add Customer</h2>
            <p className="mt-3 text-[18px] text-[#727789]">This customer will also appear in Customers route</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]" aria-label="Close modal"><CloseIcon /></button>
        </div>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="block"><span className="mb-1 block text-[17px] font-semibold text-[#171717]">Customer Name</span><input required value={form.name} onChange={(e)=>onChange('name', e.target.value)} placeholder="Customer name" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-[17px] font-semibold text-[#171717]">Phone</span><input value={form.phone} onChange={(e)=>onChange('phone', e.target.value)} placeholder="Phone" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30" /></label>
            <label className="block"><span className="mb-1 block text-[17px] font-semibold text-[#171717]">Customer Type</span><select value={form.type} onChange={(e)=>onChange('type', e.target.value)} className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"><option>Wholesale</option><option>Retail</option></select></label>
          </div>
          <label className="block"><span className="mb-1 block text-[17px] font-semibold text-[#171717]">Email</span><input value={form.email} onChange={(e)=>onChange('email', e.target.value)} placeholder="Email" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30" /></label>
          <label className="block"><span className="mb-1 block text-[17px] font-semibold text-[#171717]">Address</span><input value={form.address} onChange={(e)=>onChange('address', e.target.value)} placeholder="Address" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30" /></label>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="h-[44px] rounded-[9px] border border-[#dde2ea] px-5 text-[17px] font-semibold text-[#171717] hover:bg-[#f7f8fb]">Cancel</button><button type="submit" disabled={!canSave} className="h-[44px] rounded-[9px] bg-[#523cf0] px-6 text-[17px] font-semibold text-white hover:bg-[#4632df] disabled:opacity-60">Save Customer</button></div>
        </form>
      </div>
    </div>
  );
}

function LegacyInvoicePreviewModal({ sale, onClose, onPrint, onDownload }) {
  if (!sale) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-6">
      <div className="max-h-[calc(100vh-48px)] w-full max-w-[980px] overflow-y-auto rounded-[12px] bg-white px-[30px] py-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] pb-4">
          <div><h2 className="text-[26px] font-bold text-[#171717]">Invoice {sale.invoiceNo}</h2><p className="mt-2 text-[16px] text-[#64748b]">{sale.invoiceDate} • {sale.customerName}</p></div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]" aria-label="Close modal"><CloseIcon /></button>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr><th className="border-b px-3 py-3">Item</th><th className="border-b px-3 py-3 text-right">Qty</th><th className="border-b px-3 py-3 text-right">Price</th><th className="border-b px-3 py-3 text-right">Amount</th></tr></thead><tbody>{(sale.description||[]).map((item,i)=><tr key={i}><td className="border-b px-3 py-3 font-semibold">{item.name}</td><td className="border-b px-3 py-3 text-right">{item.quantity}</td><td className="border-b px-3 py-3 text-right">{formatMoney(item.unitPrice)}</td><td className="border-b px-3 py-3 text-right font-semibold">{formatMoney(item.amount)}</td></tr>)}</tbody></table></div>
        <div className="ml-auto mt-5 w-full max-w-[360px] space-y-2 text-[17px]"><div className="flex justify-between"><span>Subtotal</span><b>{formatMoney(sale.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>- {formatMoney(sale.discount)}</b></div><div className="flex justify-between"><span>VAT</span><b>{formatMoney(sale.tax)}</b></div><div className="flex justify-between border-t pt-2 text-[21px]"><span>Total</span><b>{formatMoney(sale.total)}</b></div><div className="flex justify-between"><span>Paid</span><b>{formatMoney(sale.paid)}</b></div>{safeNumber(sale.previousDue) > 0 ? <div className="flex justify-between"><span>Previous Due</span><b>{formatMoney(sale.previousDue)}</b></div> : null}<div className="flex justify-between"><span>Due</span><b>{formatMoney(sale.balanceDue)}</b></div>{safeNumber(sale.previousDue) > 0 ? <div className="flex justify-between border-t pt-2"><span>Total Due</span><b>{formatMoney(safeNumber(sale.totalDue) || safeNumber(sale.previousDue) + safeNumber(sale.balanceDue))}</b></div> : null}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onDownload} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#dde2ea] px-4 font-semibold hover:bg-[#f7f8fb]"><DownloadIcon /> Download</button><button type="button" onClick={onPrint} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#dde2ea] px-4 font-semibold hover:bg-[#f7f8fb]"><PrintIcon /> Print</button><button type="button" onClick={onClose} className="h-10 rounded-[9px] bg-[#523cf0] px-5 font-semibold text-white">Done</button></div>
      </div>
    </div>
  );
}

function InvoicePreviewModal({ sale, companySettings, onClose, onPrint, onDownload }) {
  if (!sale) return null;
  const company = companySettings?.company || {};
  const items = Array.isArray(sale.description) ? sale.description : [];
  const invoiceNo = sale.invoiceNo || sale.id || "INV";
  const invoiceDate = sale.invoiceDate || sale.date || todayDate();
  const status = sale.status || (safeNumber(sale.balanceDue) <= 0 ? "Paid" : "Partial");
  const subtotal = safeNumber(sale.subtotal || sale.total);
  const discount = safeNumber(sale.discount);
  const vat = safeNumber(sale.tax || sale.vat);
  const total = safeNumber(sale.total);
  const paid = safeNumber(sale.paid);
  const previousDue = safeNumber(sale.previousDue);
  const due = safeNumber(sale.balanceDue ?? total - paid);
  const totalDue = safeNumber(sale.totalDue) || previousDue + due;
  const customerName = sale.customerName || sale.companyName || "Walk-in Customer";
  const customerType = sale.saleType || sale.customerCategory || "";
  const customerAddress = sale.customerAddress || sale.address || "";
  const customerPhone = sale.customerPhone || sale.phone || "";
  const customerEmail = sale.customerEmail || sale.email || "";
  const formatInvoiceMoney = (value) => `BDT ${formatMoneyValue(value)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 px-3 py-4">
      <div className="relative mx-auto max-h-[calc(100vh-32px)] w-full max-w-[760px] overflow-hidden rounded-[8px] bg-[#eef5fb] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-[#525252] shadow-sm transition hover:bg-[#f3f4f6]" aria-label="Close modal"><CloseIcon /></button>

        <div className="max-h-[calc(100vh-32px)] overflow-y-auto px-3 py-4 sm:px-6">
          <div className="mx-auto min-h-[880px] w-full max-w-[650px] border border-[#c9d8ee] bg-white text-black">
            <div className="flex items-start justify-between px-7 pb-[54px] pt-5">
              <div>
                <h2 className="text-[24px] font-bold leading-none text-[#ff8a00]">{company.name || "Bakery ERP"}</h2>
                <div className="mt-4 space-y-[2px] text-[9px] font-semibold leading-tight">
                  <p>{company.address || "Dhaka, Bangladesh"}</p>
                  <p>Phone: {company.contactNumber || company.phone || "+880 1711-222333"}</p>
                  <p>Email: {company.email || "info@bakeryerp.com"}</p>
                </div>
              </div>
              <h3 className="text-[18px] font-bold text-[#ff8a00]">INVOICE</h3>
            </div>

            <div className="grid grid-cols-2 border-y border-black px-7 py-6">
              <div>
                <p className="text-[10px] font-bold">BILL TO</p>
                <h4 className="mt-3 text-[15px] font-bold leading-none">{customerName}</h4>
                <div className="mt-2 space-y-[3px] text-[10px] leading-tight">
                  {customerType ? <p>{customerType}</p> : null}
                  {customerAddress ? <p>Address: {customerAddress}</p> : null}
                  {customerPhone ? <p>Mobile: {customerPhone}</p> : null}
                  {customerEmail ? <p>Email: {customerEmail}</p> : null}
                </div>
              </div>

              <div className="pl-7">
                <p className="text-[10px] font-bold">INVOICE DETAILS</p>
                <div className="mt-3 space-y-[7px] text-[11px] leading-tight">
                  <p><span className="font-bold">Invoice ID:</span> {invoiceNo}</p>
                  <p>Date: {invoiceDate}</p>
                  <p>Status: {status}</p>
                  <p>Payment: {formatInvoiceMoney(paid)}</p>
                  {previousDue > 0 ? <p className="font-bold">Previous Due: {formatInvoiceMoney(previousDue)}</p> : null}
                  <p className="font-bold">Balance Due: {formatInvoiceMoney(due)}</p>
                  {previousDue > 0 ? <p className="font-bold">Total Due: {formatInvoiceMoney(totalDue)}</p> : null}
                </div>
              </div>
            </div>

            <div className="px-7 pt-5">
              <table className="w-full table-fixed text-left text-[10px]">
                <thead className="bg-[#eef3f9]">
                  <tr>
                    <th className="px-4 py-3 text-[9px] font-bold">DESCRIPTION</th>
                    <th className="w-[78px] px-3 py-3 text-center text-[9px] font-bold">QTY</th>
                    <th className="w-[112px] px-3 py-3 text-left text-[9px] font-bold">UNIT PRICE</th>
                    <th className="w-[100px] px-3 py-3 text-left text-[9px] font-bold">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.name}-${index}`} className="border-b border-black">
                      <td className="px-4 py-4 font-semibold">{item.name || `Item ${index + 1}`}</td>
                      <td className="px-3 py-4 text-center">{safeNumber(item.quantity)}</td>
                      <td className="px-3 py-4">{formatInvoiceMoney(item.unitPrice)}</td>
                      <td className="px-3 py-4">{formatInvoiceMoney(item.amount ?? item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex min-h-[280px] items-end justify-end px-7 pb-7">
              <div className="w-[265px] border-t border-black pt-2 text-[11px]">
                <div className="grid grid-cols-2 gap-y-3">
                  <span>Subtotal:</span><span>{formatInvoiceMoney(subtotal)}</span>
                  <span>Discount:</span><span>- {formatInvoiceMoney(discount)}</span>
                  <span>VAT:</span><span>{formatInvoiceMoney(vat)}</span>
                  <span className="text-[14px] font-bold">Total:</span><span className="text-[14px] font-bold text-[#ff8a00]">{formatInvoiceMoney(total)}</span>
                  <span>Paid:</span><span className="font-bold text-[#00a651]">{formatInvoiceMoney(paid)}</span>
                  {previousDue > 0 ? <><span className="font-bold">Previous Due:</span><span className="font-bold text-[#ed1c24]">{formatInvoiceMoney(previousDue)}</span></> : null}
                  <span className="font-bold">Balance Due:</span><span className="font-bold text-[#ed1c24]">{formatInvoiceMoney(due)}</span>
                  {previousDue > 0 ? <><span className="text-[14px] font-bold">Total Due:</span><span className="text-[14px] font-bold text-[#ed1c24]">{formatInvoiceMoney(totalDue)}</span></> : null}
                </div>
              </div>
            </div>

            <div className="bg-[#f4f9fd] px-7 pb-7 pt-6 text-center text-[10px]">
              <p>Thank you for your business!</p>
              <p className="mt-2">Generated by {company.name || "Bakery ERP"} on {new Date().toLocaleDateString("en-US")}</p>
            </div>
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-[650px] flex-wrap justify-end gap-3">
            <button type="button" onClick={onDownload} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#dde2ea] bg-white px-4 font-semibold hover:bg-[#f7f8fb]"><DownloadIcon /> Download</button>
            <button type="button" onClick={onPrint} className="inline-flex h-10 items-center gap-2 rounded-[9px] border border-[#dde2ea] bg-white px-4 font-semibold hover:bg-[#f7f8fb]"><PrintIcon /> Print</button>
            <button type="button" onClick={onClose} className="h-10 rounded-[9px] bg-[#523cf0] px-5 font-semibold text-white">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesPosManagement() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState(invoiceRows);
  const [salesData, setSalesData] = useState(salesRows);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [saleType, setSaleType] = useState("Wholesale");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lineItems, setLineItems] = useState([]);
  const [paidAmount, setPaidAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [discountType, setDiscountType] = useState("tk");
  const [vatAmount, setVatAmount] = useState("0");
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", address: "", type: "Wholesale" });
  const [formMessage, setFormMessage] = useState("");
  const [companySettings, setCompanySettings] = useState(() => readSystemSettings());
  const handleOpenInvoice = useCallback(async (sale) => {
    const { openInvoicePdf } = await import("../utils/invoicePdf");
    openInvoicePdf(sale, companySettings, customers);
  }, [companySettings, customers]);

  const handleDownloadInvoice = useCallback(async (sale) => {
    const { downloadInvoicePdf } = await import("../utils/invoicePdf");
    downloadInvoicePdf(sale, companySettings, customers);
  }, [companySettings, customers]);

  const handlePrintInvoice = useCallback(async (sale) => {
    const { printInvoicePdf } = await import("../utils/invoicePdf");
    printInvoicePdf(sale, companySettings, customers);
  }, [companySettings, customers]);


  useEffect(() => {
    const refreshSaleSources = () => {
      setCustomers(loadCustomers());
      setProducts(loadProducts());
    };

    const refreshSettings = () => setCompanySettings(readSystemSettings());

    refreshSaleSources();
    refreshSettings();
    setSalesHistory(loadInvoices());
    setSalesData(loadSalesRows());
    setIsStorageReady(true);

    const unsubscribePurchases = subscribePurchases(refreshSaleSources);
    const unsubscribeSettings = subscribeSystemSettings(setCompanySettings);
    window.addEventListener("focus", refreshSaleSources);
    window.addEventListener("focus", refreshSettings);
    window.addEventListener("storage", refreshSaleSources);

    return () => {
      unsubscribePurchases();
      unsubscribeSettings();
      window.removeEventListener("focus", refreshSaleSources);
      window.removeEventListener("focus", refreshSettings);
      window.removeEventListener("storage", refreshSaleSources);
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(salesHistory));
  }, [salesHistory, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(salesData));
  }, [salesData, isStorageReady]);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: `${customer.name} - ${customer.phone}`,
        raw: customer,
      })),
    [customers]
  );

  const saleTypeOptions = useMemo(
    () => [
      { value: "Wholesale", label: "Wholesale", raw: "Wholesale" },
      { value: "Retail", label: "Retail", raw: "Retail" },
    ],
    []
  );

  const discountTypeOptions = useMemo(
    () => [
      { value: "tk", label: "Tk", raw: "Tk" },
      { value: "percentage", label: "%", raw: "%" },
    ],
    []
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: productLabel(product),
        raw: product,
      })),
    [products]
  );

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  const saleSubtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.total, 0),
    [lineItems]
  );
  const discountInputValue = Math.max(safeNumber(discountAmount), 0);
  const discountValue = normalizeMoney(
    discountType === "percentage"
      ? Math.min((saleSubtotal * Math.min(discountInputValue, 100)) / 100, saleSubtotal)
      : Math.min(discountInputValue, saleSubtotal)
  );
  const discountSummary =
    discountType === "percentage"
      ? `${Math.min(discountInputValue, 100)}% (${formatMoney(discountValue)})`
      : formatMoney(discountValue);
  const vatValue = normalizeMoney(Math.max(safeNumber(vatAmount), 0));
  const saleTotal = normalizeMoney(Math.max(saleSubtotal - discountValue + vatValue, 0));
  const selectedCustomerPreviousDue = useMemo(
    () => calculatePreviousDueForCustomer(selectedCustomer, salesHistory),
    [selectedCustomer, salesHistory]
  );

  const todaySales = useMemo(() => {
    const currentDate = todayDate();

    return salesHistory
      .filter((sale) => (sale.invoiceDate || sale.date) === currentDate)
      .reduce((sum, sale) => sum + safeNumber(sale.total), 0);
  }, [salesHistory]);

  const canAddProduct =
    selectedProduct &&
    Number(quantity) > 0 &&
    Number(quantity) <= Number(selectedProduct.stock || 0);
  const createPaidAmount = paidAmount === "" ? saleTotal : safeNumber(paidAmount);
  const canCreateSale = Boolean(selectedCustomer && lineItems.length > 0);

  const addProduct = () => {
    if (!canAddProduct) {
      setFormMessage("Select a product and valid quantity.");
      return;
    }

    const nextQuantity = Number(quantity);
    const nextItem = {
      id: selectedProduct.id,
      name: `${selectedProduct.name} (${selectedProduct.packetSize})`,
      quantity: nextQuantity,
      unitPrice: Number(selectedProduct.price || 0),
      total: nextQuantity * Number(selectedProduct.price || 0),
    };

    setLineItems((current) => {
      const existing = current.find((item) => item.id === nextItem.id);
      if (!existing) return [...current, nextItem];

      return current.map((item) =>
        item.id === nextItem.id
          ? {
              ...item,
              quantity: item.quantity + nextQuantity,
              total: (item.quantity + nextQuantity) * item.unitPrice,
            }
          : item
      );
    });
    setProducts((current) =>
      current.map((product) =>
        product.id === selectedProduct.id
          ? { ...product, stock: Math.max(Number(product.stock || 0) - nextQuantity, 0) }
          : product
      )
    );
    setSelectedProductId("");
    setQuantity("1");
    setFormMessage("");
  };

  const removeLineItem = (itemToRemove) => {
    setLineItems((current) => current.filter((item) => item.id !== itemToRemove.id));
    setProducts((current) =>
      current.map((product) =>
        product.id === itemToRemove.id
          ? { ...product, stock: Number(product.stock || 0) + itemToRemove.quantity }
          : product
      )
    );
  };

  const createSale = () => {
    if (!canCreateSale) {
      setFormMessage("Choose customer and add at least one product.");
      return;
    }

    const invoiceNo = nextInvoiceNo(salesHistory);
    const currentDate = todayDate();
    const paid = normalizeMoney(Math.min(Math.max(createPaidAmount, 0), saleTotal));
    const balanceDue = normalizeMoney(Math.max(saleTotal - paid, 0));
    const previousDue = selectedCustomerPreviousDue;
    const source = saleType === "Retail" ? "Website" : "";
    const newSale = {
      id: invoiceNo,
      invoiceNo,
      invoiceDate: currentDate,
      date: currentDate,
      customerId: selectedCustomer.id,
      companyName: selectedCustomer.name,
      customerName: selectedCustomer.name,
      customerCategory: saleType,
      saleType,
      customerPhone: selectedCustomer.phone || "",
      customerEmail: selectedCustomer.email || "",
      customerAddress: selectedCustomer.address || "",
      source,
      items: lineItems.length,
      status: balanceDue <= 0 ? "Paid" : "Partial",
      description: lineItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.total,
      })),
      subtotal: saleSubtotal,
      discount: discountValue,
      discountType,
      discountInput: discountInputValue,
      tax: vatValue,
      vat: vatValue,
      total: saleTotal,
      paid,
      previousDue,
      balanceDue,
      totalDue: normalizeMoney(previousDue + balanceDue),
    };

    setSalesHistory((current) => [newSale, ...current]);
    setSalesData((current) => [
      {
        id: `SA-${String(current.length + 1).padStart(3, "0")}`,
        items: lineItems.length,
        companyName: selectedCustomer.name,
        status: balanceDue <= 0 ? "Complete" : "Pending",
        barcode: invoiceNo,
      },
      ...current,
    ]);
    setLineItems([]);
    setSelectedCustomerId("");
    setSaleType("Wholesale");
    setPaidAmount("");
    setDiscountAmount("0");
    setDiscountType("tk");
    setVatAmount("0");
    setCreatedInvoice(newSale);
    setFormMessage(`Sale ${invoiceNo} created.`);
  };

  const updateCustomerForm = (field, value) => setCustomerForm((current) => ({ ...current, [field]: value }));

  const handleAddCustomer = async (event) => {
    event.preventDefault();
    const name = customerForm.name.trim();
    if (!name) return;
    const newCustomer = {
      id: `CUS-${Date.now()}`,
      customerName: name,
      companyName: name,
      name,
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
      type: customerForm.type || "Wholesale",
      customerCategory: customerForm.type || "Wholesale",
    };
    const nextCustomers = [newCustomer, ...customers];
    setCustomers(nextCustomers);
    setSelectedCustomerId(newCustomer.id);
    setSaleType(newCustomer.type);
    window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(nextCustomers));
    await flushDbKey(CUSTOMERS_STORAGE_KEY).catch(() => {});
    setCustomerForm({ name: "", phone: "", email: "", address: "", type: "Wholesale" });
    setIsCustomerModalOpen(false);
  };

  return (
    <>
    {isCustomerModalOpen ? (
      <CustomerQuickAddModal form={customerForm} onChange={updateCustomerForm} onClose={() => setIsCustomerModalOpen(false)} onSubmit={handleAddCustomer} />
    ) : null}
    {createdInvoice ? (
      <InvoicePreviewModal sale={createdInvoice} companySettings={companySettings} onClose={() => setCreatedInvoice(null)} onPrint={() => handlePrintInvoice(createdInvoice)} onDownload={() => handleDownloadInvoice(createdInvoice)} />
    ) : null}
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
            Sales
          </h1>
          <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
            Create invoices and manage sales
          </p>
        </div>

        <div className="mt-8 grid gap-[30px] lg:grid-cols-[minmax(0,1fr)_345px]">
          <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[20px] font-semibold text-[#171717]">Create New Sale</h2><button type="button" onClick={() => setIsCustomerModalOpen(true)} className="inline-flex h-[40px] items-center gap-2 rounded-[9px] border border-[#dde2ea] bg-white px-4 text-[16px] font-semibold text-[#171717] transition hover:bg-[#f7f8fb]"><span className="text-[22px] leading-none">+</span> Add Customer</button></div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <FormSelect
                label="Select Customer"
                placeholder="Choose customer"
                value={selectedCustomerId}
                options={customerOptions}
                onChange={(value) => {
                  setSelectedCustomerId(value);
                  const customer = customers.find((item) => item.id === value);
                  if (customer?.type) setSaleType(customer.type);
                }}
              />

              <FormSelect
                label="Sale Type"
                placeholder="Sale type"
                value={saleType}
                options={saleTypeOptions}
                onChange={setSaleType}
              />
            </div>

            <div className="mt-6 border-t border-[#e5e7eb] pt-6">
              <h2 className="text-[22px] font-semibold text-[#171717]">Add Products</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_158px_101px]">
                <FormSelect
                  placeholder="Select product"
                  value={selectedProductId}
                  options={productOptions}
                  onChange={setSelectedProductId}
                  formatOption={productLabel}
                />

                <input
                  type="number"
                  min="1"
                  max={selectedProduct?.stock || undefined}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"
                />

                <button
                  type="button"
                  onClick={addProduct}
                  disabled={!canAddProduct}
                  className={`h-[45px] rounded-[9px] px-5 text-[18px] font-semibold text-white transition ${
                    canAddProduct
                      ? "bg-[#523cf0] hover:bg-[#4632df]"
                      : "cursor-not-allowed bg-[#8a8993]"
                  }`}
                >
                  Add
                </button>
              </div>

              {lineItems.length > 0 ? (
                <div className="mt-5 rounded-[12px] border border-[#e5e7eb] bg-[#fafafa] p-4">
                  <div className="space-y-2">
                    {lineItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-[8px] bg-white px-3 py-2 text-[15px]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#171717]">{item.name}</p>
                          <p className="mt-1 text-[#64748b]">
                            {item.quantity} x {formatMoney(item.unitPrice)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-bold text-[#171717]">{formatMoney(item.total)}</span>
                          <button
                            type="button"
                            onClick={() => removeLineItem(item)}
                            className="grid h-7 w-7 place-items-center rounded-full text-[#64748b] hover:bg-[#f1f5f9]"
                            aria-label={`Remove ${item.name}`}
                          >
                            x
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-[14px] font-semibold text-[#171717]">Discount</span>
                      <div className="grid gap-2 sm:grid-cols-[1fr_108px]">
                        <input
                          type="number"
                          min="0"
                          max={discountType === "percentage" ? 100 : saleSubtotal}
                          value={discountAmount}
                          onChange={(event) => setDiscountAmount(event.target.value)}
                          placeholder="0"
                          className="h-[42px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-3 text-[16px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"
                        />
                        <FormSelect
                          placeholder="Type"
                          value={discountType}
                          options={discountTypeOptions}
                          onChange={setDiscountType}
                        />
                      </div>
                    </div>
                    <label className="block"><span className="mb-1 block text-[14px] font-semibold text-[#171717]">VAT ({BDT_SYMBOL})</span><input type="number" min="0" value={vatAmount} onChange={(event) => setVatAmount(event.target.value)} placeholder="0" className="h-[42px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-3 text-[16px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30" /></label>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_150px] md:items-end">
                    <div>
                      <p className="text-[14px] font-semibold text-[#64748b]">Sale Total</p>
                      <p className="mt-1 text-[24px] font-bold text-[#171717]">{formatMoney(saleTotal)}</p>
                      <p className="mt-1 text-[13px] text-[#64748b]">Subtotal {formatMoney(saleSubtotal)} - Discount {discountSummary} + VAT {formatMoney(vatValue)}</p>
                      {selectedCustomerPreviousDue > 0 ? (
                        <p className="mt-2 rounded-[8px] bg-[#fff7ed] px-3 py-2 text-[13px] font-bold text-[#c2410c]">
                          Previous Due: {formatMoney(selectedCustomerPreviousDue)}
                        </p>
                      ) : null}
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-[14px] font-semibold text-[#171717]">
                        Payment Amount
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={saleTotal}
                        value={paidAmount}
                        onChange={(event) => setPaidAmount(event.target.value)}
                        placeholder={String(saleTotal)}
                        className="h-[42px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-3 text-[16px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={createSale}
                      disabled={!canCreateSale}
                      className="h-[42px] rounded-[9px] bg-[#523cf0] px-5 text-[16px] font-semibold text-white transition hover:bg-[#4632df] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Create Invoice
                    </button>
                  </div>
                </div>
              ) : null}

              {formMessage ? (
                <p className="mt-4 text-[14px] font-semibold text-[#027a48]">{formMessage}</p>
              ) : null}
            </div>
          </article>

          <aside className="rounded-[16px] border border-[#a7f3c1] bg-[#ecfdf3] px-[30px] py-7 text-[#006b2f]">
            <h2 className="text-[20px] font-semibold">Sales Summary</h2>

            <div className="mt-[34px] rounded-[10px] bg-white/80 px-5 py-7">
              <div className="flex items-center gap-4">
                <DollarIcon />
                <div>
                  <p className="text-[18px] leading-6 text-[#00843d]">Total Sales Today</p>
                  <p className="mt-1 text-[30px] font-bold leading-none text-[#171717]">
                    {formatMoney(todaySales)}
                  </p>
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-[18px] leading-6">
              <li>• Add customer details</li>
              <li>• Select products and quantities</li>
              <li>• Enter payment amount</li>
              <li>• Generate invoice</li>
            </ul>
          </aside>
        </div>

        <article className="mt-[30px] rounded-[16px] border border-[#dde2ea] bg-white px-7 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[20px] font-semibold text-[#171717]">Sales History</h2>

          <div className="mt-[34px] overflow-x-auto">
            <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Date
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Invoice Name
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Customer
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Type
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Source
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Total
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Paid
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map((sale) => (
                  <tr key={sale.id} className="transition hover:bg-[#f3f4f8]">
                    <td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#171717]">
                      {sale.invoiceDate || sale.date}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px]">
                      <div className="flex items-center gap-3">
                        <span className="text-[18px] font-bold text-[#171717]">
                          {sale.invoiceNo || sale.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenInvoice(sale)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ea] text-[#475569] transition hover:bg-[#eef2ff] hover:text-[#523cf0]"
                          title="View invoice"
                          aria-label={`View invoice ${sale.invoiceNo || sale.id}`}
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(sale)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ea] text-[#475569] transition hover:bg-[#ecfdf3] hover:text-[#00843d]"
                          title="Download invoice"
                          aria-label={`Download invoice ${sale.invoiceNo || sale.id}`}
                        >
                          <DownloadIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(sale)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dbe2ea] text-[#475569] transition hover:bg-[#fff7ed] hover:text-[#ea580c]"
                          title="Print invoice"
                          aria-label={`Print invoice ${sale.invoiceNo || sale.id}`}
                        >
                          <PrintIcon />
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] font-semibold text-[#171717]">
                      {sale.customerName || sale.companyName}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px]">
                      <TypeChip type={sale.saleType || sale.customerCategory} />
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px]">
                      <SourceChip source={sale.source} />
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] font-bold text-[#171717]">
                      {formatMoney(sale.total)}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#00a846]">
                      {formatMoney(sale.paid)}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#00a846]">
                      {formatMoney(sale.balanceDue)}
                    </td>
                  </tr>
                ))}

                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                      No sales found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
    </>
  );
}
