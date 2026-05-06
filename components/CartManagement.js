"use client";

import { useRef, useState } from "react";
import { readFinishedInventoryRows } from "../utils/finishedStockStore";

const INVOICES_STORAGE_KEY = "erp-invoice-rows";
const SALES_STORAGE_KEY = "erp-sales-rows";
const BDT_SYMBOL = "\u09F3";

function todayDate() { return new Date().toISOString().slice(0, 10); }
function money(v) { return Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function readStoredArray(key) {
  if (typeof window === "undefined") return [];
  try { const parsed = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function saveStoredArray(key, rows) { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : [])); }
function findStockByBarcode(code) {
  const clean = String(code || "").trim();
  return readFinishedInventoryRows({ includeDefaults: false }).find((row) => String(row.barcode || row.productBarcode || "").trim() === clean);
}
function printHtml(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function invoiceHtml(invoice) {
  const rows = (invoice.description || invoice.items || []).map((item, i) => `
    <tr><td>${i + 1}</td><td>${item.productName}</td><td>${item.packetSize}</td><td>${item.barcode || ""}</td><td>${item.quantity}</td><td>${money(item.pricePerUnit)}</td><td>${money(item.total)}</td></tr>
  `).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceNo}</title><style>
    body{font-family:Arial,sans-serif;color:#111;padding:32px} h1{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin-top:24px} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f3f4f6}.summary{margin-top:20px;margin-left:auto;width:280px}.summary div{display:flex;justify-content:space-between;padding:6px 0}.total{font-weight:bold;font-size:18px;border-top:2px solid #111}</style></head><body>
    <h1>Sales Invoice</h1><p><b>Invoice:</b> ${invoice.invoiceNo}</p><p><b>Date:</b> ${invoice.invoiceDate || invoice.date}</p><p><b>Customer:</b> ${invoice.customerName || "Walk-in Customer"}</p>
    <table><thead><tr><th>#</th><th>Product</th><th>Packet</th><th>Barcode</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="summary"><div><span>Subtotal</span><span>${BDT_SYMBOL}${money(invoice.subtotal)}</span></div><div><span>VAT</span><span>${BDT_SYMBOL}${money(invoice.vat)}</span></div><div><span>Discount</span><span>${BDT_SYMBOL}${money(invoice.discount)}</span></div><div class="total"><span>Total</span><span>${BDT_SYMBOL}${money(invoice.total)}</span></div><div><span>Paid</span><span>${BDT_SYMBOL}${money(invoice.paid)}</span></div><div><span>Due</span><span>${BDT_SYMBOL}${money(invoice.balanceDue)}</span></div></div>
  </body></html>`;
}

export default function CartManagement() {
  const scanRef = useRef(null);
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [vat, setVat] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [invoice, setInvoice] = useState(null);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.pricePerUnit || 0), 0);
  const grandTotal = Math.max(subtotal + Number(vat || 0) - Number(discount || 0), 0);

  const addByBarcode = async (code) => {
    const clean = String(code || barcode).trim();
    if (!clean || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const found = findStockByBarcode(clean);
      if (!found) throw new Error(`No finished stock found for barcode ${clean}`);
      const normalized = {
        stockId: found.id || found.stock_code,
        productName: found.productName || found.name,
        packetSize: found.packetSize || "pcs",
        type: found.type || found.sourceType || "Finished Product",
        barcode: found.barcode || clean,
        availableStock: Number(found.quantity || 0),
        pricePerUnit: Number(found.pricePerUnit || found.sellingPricePerUnit || 0),
        quantity: 1,
      };
      if (normalized.availableStock <= 0) throw new Error(`${normalized.productName} stock nai.`);
      setCart((current) => {
        const existing = current.find((item) => item.barcode === normalized.barcode);
        if (existing) {
          if (Number(existing.quantity || 0) + 1 > normalized.availableStock) {
            setMessage(`Stock limit reached for ${normalized.productName}.`);
            return current;
          }
          return current.map((item) => item.barcode === normalized.barcode ? { ...item, availableStock: normalized.availableStock, quantity: Number(item.quantity || 0) + 1 } : item);
        }
        return [normalized, ...current];
      });
      setBarcode("");
      setTimeout(() => scanRef.current?.focus(), 30);
    } catch (error) {
      setMessage(error.message || "Barcode scan failed");
    } finally {
      setLoading(false);
    }
  };

  const updateQty = (barcodeValue, qty) => {
    const nextQty = Math.max(1, Number(qty || 1));
    setCart((current) => current.map((item) => {
      if (item.barcode !== barcodeValue) return item;
      if (nextQty > Number(item.availableStock || 0)) {
        setMessage(`Only ${item.availableStock} pcs available for ${item.productName}.`);
        return item;
      }
      return { ...item, quantity: nextQty };
    }));
  };

  const checkout = async () => {
    if (cart.length === 0 || loading) return;
    setLoading(true);
    setMessage("");
    try {
      const invoiceNo = `INV-${Date.now()}`;
      const rows = cart.map((item) => ({
        stockId: item.stockId,
        productName: item.productName,
        packetSize: item.packetSize,
        type: item.type,
        barcode: item.barcode,
        quantity: Number(item.quantity || 0),
        pricePerUnit: Number(item.pricePerUnit || 0),
        total: Number(item.quantity || 0) * Number(item.pricePerUnit || 0),
      }));
      const nextInvoice = {
        id: invoiceNo, invoiceNo, date: todayDate(), invoiceDate: todayDate(),
        customerName: customerName || "Walk-in Customer",
        description: rows.map((row) => ({ ...row, name: `${row.productName} (${row.packetSize})` })),
        items: rows, subtotal, vat: Number(vat || 0), discount: Number(discount || 0),
        total: grandTotal, paid: grandTotal, balanceDue: 0,
      };
      saveStoredArray(INVOICES_STORAGE_KEY, [nextInvoice, ...readStoredArray(INVOICES_STORAGE_KEY)]);
      saveStoredArray(SALES_STORAGE_KEY, [nextInvoice, ...readStoredArray(SALES_STORAGE_KEY)]);
      setInvoice(nextInvoice);
      setCart([]);
      setCustomerName("");
      setVat("0");
      setDiscount("0");
      window.dispatchEvent(new Event("erp-data-changed"));
    } catch (error) {
      setMessage(error.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <h1 className="text-[30px] font-bold tracking-[-0.02em] text-[#0f172a]">Barcode Cart</h1>
        <p className="mt-2 text-[20px] text-[#64748b]">Physical scanner input will add products row by row. Done sale creates invoice, updates sales/accounts, and reduces finished stock.</p>
        <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white p-7 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_160px_160px]">
            <input ref={scanRef} value={barcode} onChange={(e)=>setBarcode(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); addByBarcode(); } }} placeholder="Scan barcode here" className="h-[48px] rounded-[9px] bg-[#f0f0f3] px-4 font-mono text-[18px] outline-none focus:ring-2 focus:ring-[#523cf0]/25" autoFocus />
            <input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="Customer name" className="h-[48px] rounded-[9px] bg-[#f0f0f3] px-4 text-[17px] outline-none" />
            <input type="number" value={vat} onChange={(e)=>setVat(e.target.value)} placeholder="VAT" className="h-[48px] rounded-[9px] bg-[#f0f0f3] px-4 text-[17px] outline-none" />
            <input type="number" value={discount} onChange={(e)=>setDiscount(e.target.value)} placeholder="Discount" className="h-[48px] rounded-[9px] bg-[#f0f0f3] px-4 text-[17px] outline-none" />
          </div>
          {message ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left"><thead><tr className="text-[16px] text-[#475569]"><th className="border-b p-3">Product</th><th className="border-b p-3">Barcode</th><th className="border-b p-3">Stock</th><th className="border-b p-3">Qty</th><th className="border-b p-3">Price</th><th className="border-b p-3">Total</th><th className="border-b p-3"></th></tr></thead><tbody>
              {cart.map((item)=>(<tr key={item.barcode}><td className="border-b p-3 font-semibold">{item.productName} <span className="text-sm text-[#64748b]">({item.packetSize})</span></td><td className="border-b p-3 font-mono text-sm">{item.barcode}</td><td className="border-b p-3">{item.availableStock}</td><td className="border-b p-3"><input type="number" min="1" value={item.quantity} onChange={(e)=>updateQty(item.barcode,e.target.value)} className="h-10 w-24 rounded bg-[#f1f5f9] px-3" /></td><td className="border-b p-3">{BDT_SYMBOL}{money(item.pricePerUnit)}</td><td className="border-b p-3 font-bold">{BDT_SYMBOL}{money(Number(item.quantity)*Number(item.pricePerUnit))}</td><td className="border-b p-3"><button onClick={()=>setCart((c)=>c.filter((x)=>x.barcode!==item.barcode))} className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Remove</button></td></tr>))}
              {cart.length===0?<tr><td colSpan="7" className="p-10 text-center text-[#64748b]">No scanned products in cart.</td></tr>:null}
            </tbody></table>
          </div>
          <div className="mt-6 flex flex-col items-end gap-2 text-[18px]"><p>Subtotal: <b>{BDT_SYMBOL}{money(subtotal)}</b></p><p>VAT: <b>{BDT_SYMBOL}{money(vat)}</b></p><p>Discount: <b>{BDT_SYMBOL}{money(discount)}</b></p><p className="text-[24px]">Total: <b>{BDT_SYMBOL}{money(grandTotal)}</b></p><button onClick={checkout} disabled={cart.length===0 || loading} className="mt-2 rounded-[8px] bg-[#523cf0] px-6 py-3 text-white disabled:opacity-50">{loading ? "Processing..." : "Done / Create Invoice"}</button></div>
        </article>
      </div>
      {invoice ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="max-h-[92vh] w-full max-w-[760px] overflow-y-auto rounded-2xl bg-white p-6"><h2 className="text-2xl font-bold">Invoice Created</h2><p className="mt-2 text-[#64748b]">Do you want to print or download the invoice?</p><div className="mt-5 rounded-xl border p-4"><p><b>{invoice.invoiceNo}</b> — {invoice.customerName}</p><p>Total: {BDT_SYMBOL}{money(invoice.total)}</p></div><div className="mt-6 flex justify-end gap-3"><button className="rounded-lg bg-slate-100 px-4 py-2 font-semibold" onClick={()=>setInvoice(null)}>Close</button><button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" onClick={()=>downloadHtml(`${invoice.invoiceNo}.html`, invoiceHtml(invoice))}>Download</button><button className="rounded-lg bg-[#523cf0] px-4 py-2 font-semibold text-white" onClick={()=>printHtml(invoiceHtml(invoice))}>Print</button></div></div></div> : null}
    </section>
  );
}
