"use client";

import { useEffect, useMemo, useState } from "react";
import { flushDbKey } from "../lib/apiSync";

const ACCOUNTS_JOURNAL_STORAGE_KEY = "erp-accounts-journal-entries";
const BDT_SYMBOL = "\u09F3";
const PAYABLE_RECEIVABLE_TERMS = ["payable", "receivable", "receiveable"];

const emptyForm = { ledger: "", description: "", debit: "", credit: "" };

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function safeNumber(v) { const n = Number(String(v ?? 0).replace(/,/g, "")); return Number.isFinite(n) ? n : 0; }
function formatMoney(v) { const n = Math.round(Math.abs(safeNumber(v))); return `${safeNumber(v)<0?"-":""}${BDT_SYMBOL}${n.toLocaleString("en-US")}`; }
function readArray(key) {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(window.localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function normalizeDate(row) { return row.date || row.invoiceDate || row.paymentDate || row.purchaseDate || row.expenseDate || row.itemDate || todayDate(); }
function normalizeEntry(entry, index) {
  return {
    id: entry.id || entry.entryCode || `JE-${String(index+1).padStart(3,"0")}`,
    date: normalizeDate(entry),
    ledger: entry.ledger || entry.account || "Cash",
    description: entry.description || entry.note || "Journal transaction",
    debit: safeNumber(entry.debit),
    credit: safeNumber(entry.credit),
    source: entry.source || "Manual",
  };
}
function getName(row, keys) { for (const k of keys) if (row?.[k]) return row[k]; return ""; }
function makeEntry({ id, date, ledger, description, debit=0, credit=0, source }) {
  return { id, date: date || todayDate(), ledger, description, debit: safeNumber(debit), credit: safeNumber(credit), source };
}
function isPayableReceivableEntry(entry) {
  const text = `${entry?.ledger || ""} ${entry?.description || ""} ${entry?.source || ""}`.toLowerCase();
  return PAYABLE_RECEIVABLE_TERMS.some((term) => text.includes(term));
}
function deriveSystemEntries() {
  const entries = [];
  const sales = [...readArray("erp-invoice-rows"), ...readArray("erp-sales-rows")];
  const seenSales = new Set();
  sales.forEach((s, i) => {
    const inv = s.invoiceNo || s.id || s.sale_code || `SALE-${i+1}`;
    if (seenSales.has(inv)) return; seenSales.add(inv);
    const amount = safeNumber(s.paid || s.receivedAmount || s.total || s.grandTotal || s.totalAmount || s.amount);
    if (amount > 0) entries.push(makeEntry({ id:`AUTO-SALE-${inv}`, date: normalizeDate(s), ledger:"Sales / Cash In", description:`Sales invoice ${inv} - ${getName(s,["customerName","companyName","customer"])}`, debit: amount, source:"Sales" }));
  });
  readArray("erp-expense-history").forEach((e, i) => {
    const amount = safeNumber(e.amount || e.total);
    if (amount > 0) entries.push(makeEntry({ id:`AUTO-EXP-${e.id||i+1}`, date: normalizeDate(e), ledger:`Expense${e.type||e.category?` - ${e.type||e.category}`:""}`, description: e.note || e.description || "Expense", credit: amount, source:"Expense" }));
  });
  readArray("erp-miscellaneous-items").forEach((m, i) => {
    const amount = safeNumber(m.amount || m.total);
    if (amount <= 0) return;
    const text = String(m.type || m.category || m.kind || m.transactionType || "").toLowerCase();
    const isIncome = text.includes("income") || text.includes("receive") || text.includes("deposit") || text.includes("cash in");
    entries.push(makeEntry({ id:`AUTO-MISC-${m.id||i+1}`, date: normalizeDate(m), ledger: isIncome ? "Miscellaneous Income / Cash In" : "Miscellaneous Expense / Cash Out", description: m.note || m.description || m.name || "Miscellaneous", debit: isIncome ? amount : 0, credit: isIncome ? 0 : amount, source:"Miscellaneous" }));
  });
  return entries.filter((entry) => !isPayableReceivableEntry(entry));
}
function loadManualEntries() { return readArray(ACCOUNTS_JOURNAL_STORAGE_KEY).map(normalizeEntry).filter(e => !String(e.id).startsWith("AUTO-") && !isPayableReceivableEntry(e)); }
function inferLedgerType(ledger) {
  const t = String(ledger||"").toLowerCase();
  if (t.includes("sales") || t.includes("income") || t.includes("cash in")) return "Debit";
  if (t.includes("payment") || t.includes("expense") || t.includes("cash out") || t.includes("supplier")) return "Credit";
  return "Manual";
}
function createLedgerRows(entries) {
  const map = new Map();
  entries.forEach(e => {
    const key = e.ledger || "Cash";
    const cur = map.get(key) || { ledger:key, type: inferLedgerType(key), debit:0, credit:0 };
    cur.debit += safeNumber(e.debit); cur.credit += safeNumber(e.credit); map.set(key, cur);
  });
  return Array.from(map.values()).map(r => ({ ...r, balance: r.debit - r.credit })).sort((a,b)=>a.ledger.localeCompare(b.ledger));
}
function typeBadgeClass(type) {
  if (type === "Debit") return "bg-[#e7f0ff] text-[#1671ff] ring-[#a8d0ff]";
  if (type === "Credit") return "bg-[#ffe8e8] text-[#ff2222] ring-[#ffb7b7]";
  return "bg-[#fff1e8] text-[#ff4d00] ring-[#ffcfb5]";
}
function PlusIcon(){return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>}
function CloseIcon(){return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>}
function TrendUpIcon(){return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 16 6-6 4 4 6-7"/><path d="M15 7h5v5"/></svg>}
function TrendDownIcon(){return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 8 6 6 4-4 6 7"/><path d="M15 17h5v-5"/></svg>}
function BookIcon(){return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M4 5.5A2.5 2.5 0 0 0 6.5 8H20"/><path d="M12 8v11"/></svg>}
function SummaryCard({title,value,caption,tone}){const icon=tone==="credit"?<span className="grid h-[50px] w-[50px] place-items-center rounded-[11px] bg-[#fff0f2] text-[#ff001f]"><TrendDownIcon/></span>:tone==="balance"?<span className="grid h-[50px] w-[50px] place-items-center rounded-[11px] bg-[#eef2ff] text-[#523cf0]"><BookIcon/></span>:<span className="grid h-[50px] w-[50px] place-items-center rounded-[11px] bg-[#eafbf1] text-[#00a846]"><TrendUpIcon/></span>;return <article className="min-h-[162px] rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><div className="flex items-start justify-between gap-4"><div><p className="text-[18px] leading-6 text-[#4b5c78]">{title}</p><p className="mt-3 text-[38px] font-bold leading-none text-[#0f172a]">{value}</p><p className="mt-3 text-[16px] leading-5 text-[#4b5c78]">{caption}</p></div>{icon}</div></article>}
function JournalModal({form,canSave,onChange,onClose,onSubmit}){return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-6"><div className="w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-[24px] font-semibold leading-tight text-[#171717]">New Journal Entry</h2><p className="mt-3 text-[18px] text-[#727789]">Add a manual journal transaction</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]" aria-label="Close modal"><CloseIcon/></button></div><form onSubmit={onSubmit} className="mt-5 space-y-[18px]"><label className="block"><span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Ledger</span><input required value={form.ledger} onChange={e=>onChange("ledger",e.target.value)} placeholder="e.g., Cash, Supplier Payment, Expense" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"/></label><label className="block"><span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Description</span><input required value={form.description} onChange={e=>onChange("description",e.target.value)} placeholder="Transaction description" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"/></label><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Debit ({BDT_SYMBOL})</span><input type="number" min="0" value={form.debit} onChange={e=>onChange("debit",e.target.value)} placeholder="0" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"/></label><label className="block"><span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Credit ({BDT_SYMBOL})</span><input type="number" min="0" value={form.credit} onChange={e=>onChange("credit",e.target.value)} placeholder="0" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"/></label></div><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="h-[46px] rounded-[9px] border border-[#dde2ea] px-5 text-[17px] font-semibold text-[#171717] hover:bg-[#f7f8fb]">Cancel</button><button type="submit" disabled={!canSave} className="h-[46px] rounded-[9px] bg-[#523cf0] px-6 text-[17px] font-semibold text-white hover:bg-[#4632df] disabled:opacity-60">Save Entry</button></div></form></div></div>}

export default function AccountsFinanceManagement() {
  const [activeTab,setActiveTab]=useState("journal");
  const [manualEntries,setManualEntries]=useState([]);
  const [tick,setTick]=useState(0);
  const [isModalOpen,setIsModalOpen]=useState(false);
  const [form,setForm]=useState(emptyForm);
  useEffect(()=>{const refresh=()=>{setManualEntries(loadManualEntries());setTick(t=>t+1)};refresh();window.addEventListener("storage",refresh);window.addEventListener("focus",refresh);return()=>{window.removeEventListener("storage",refresh);window.removeEventListener("focus",refresh)}},[]);
  const systemEntries=useMemo(()=>deriveSystemEntries(),[tick]);
  const journalEntries=useMemo(()=>[...systemEntries,...manualEntries].sort((a,b)=>String(b.date).localeCompare(String(a.date))),[systemEntries,manualEntries]);
  const ledgerRows=useMemo(()=>createLedgerRows(journalEntries),[journalEntries]);
  const totalDebit=journalEntries.reduce((s,e)=>s+safeNumber(e.debit),0);
  const totalCredit=journalEntries.reduce((s,e)=>s+safeNumber(e.credit),0);
  const netBalance=totalDebit-totalCredit;
  const draftEntry={ledger:form.ledger,description:form.description,source:"Manual"};
  const canSave=form.ledger.trim()&&form.description.trim()&&(safeNumber(form.debit)>0||safeNumber(form.credit)>0)&&!isPayableReceivableEntry(draftEntry);
  const updateForm=(f,v)=>setForm(cur=>({...cur,[f]:v}));
  const closeModal=()=>{setForm(emptyForm);setIsModalOpen(false)};
  const handleAddEntry=async(e)=>{e.preventDefault();if(!canSave)return;const newEntry={id:`JE-${Date.now()}`,date:todayDate(),ledger:form.ledger.trim(),description:form.description.trim(),debit:safeNumber(form.debit),credit:safeNumber(form.credit),source:"Manual"};const next=[newEntry,...manualEntries];setManualEntries(next);window.localStorage.setItem(ACCOUNTS_JOURNAL_STORAGE_KEY,JSON.stringify(next));await flushDbKey(ACCOUNTS_JOURNAL_STORAGE_KEY).catch(()=>{});closeModal()};
  return <>{isModalOpen?<JournalModal form={form} canSave={canSave} onChange={updateForm} onClose={closeModal} onSubmit={handleAddEntry}/>:null}<section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto w-full max-w-[1320px]"><div><h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">Accounts</h1><p className="mt-2 text-[20px] leading-6 text-[#64748b]">Manage ledgers and financial transactions</p></div><div className="mt-8 grid gap-5 md:grid-cols-3"><SummaryCard title="Total Debit" value={formatMoney(totalDebit)} caption="Sales / cash in" tone="debit"/><SummaryCard title="Total Credit" value={formatMoney(totalCredit)} caption="Cash out entries" tone="credit"/><SummaryCard title="Net Balance" value={formatMoney(netBalance)} caption={netBalance>=0?"Net cash in":"Net cash out"} tone="balance"/></div><div className="mt-[30px] inline-flex self-start rounded-full bg-[#e7e8ee] p-1"><button type="button" onClick={()=>setActiveTab("journal")} className={`h-9 rounded-full px-4 text-[17px] font-semibold transition ${activeTab==="journal"?"bg-white text-[#171717] shadow-sm":"text-[#171717] hover:bg-white/60"}`}>Journal</button><button type="button" onClick={()=>setActiveTab("ledger")} className={`h-9 rounded-full px-4 text-[17px] font-semibold transition ${activeTab==="ledger"?"bg-white text-[#171717] shadow-sm":"text-[#171717] hover:bg-white/60"}`}>Ledgers</button></div>{activeTab==="journal"?<article className="mt-10 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><h2 className="text-[20px] font-semibold text-[#171717]">Journal Entries</h2><p className="mt-2 text-[15px] text-[#64748b]">Payable/receivable calculations and entries are excluded from journal and ledger.</p><div className="mt-[24px] overflow-x-auto"><table className="min-w-[1080px] w-full border-separate border-spacing-0 text-left"><thead><tr>{["Date","Source","Ledger","Description","Debit","Credit"].map(h=><th key={h} className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold uppercase text-[#171717] last:text-right">{h}</th>)}</tr></thead><tbody>{journalEntries.map(e=><tr key={e.id} className="transition hover:bg-[#f3f4f8]"><td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#4b5c78]">{e.date}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#4b5c78]">{e.source}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] font-semibold text-[#171717]">{e.ledger}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] text-[#4b5c78]">{e.description}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-right text-[18px] font-semibold text-[#171717]">{e.debit?formatMoney(e.debit):"-"}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-right text-[18px] font-semibold text-[#171717]">{e.credit?formatMoney(e.credit):"-"}</td></tr>)}{journalEntries.length===0?<tr><td colSpan="6" className="px-3 py-10 text-center text-[16px] text-[#64748b]">No journal entries found.</td></tr>:null}</tbody></table></div></article>:<article className="mt-10 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"><h2 className="text-[20px] font-semibold text-[#171717]">Ledger Summary</h2><div className="mt-[34px] overflow-x-auto"><table className="min-w-[980px] w-full border-separate border-spacing-0 text-left"><thead><tr>{["Ledger Name","Type","Debit","Credit","Balance"].map(h=><th key={h} className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold uppercase text-[#171717] last:text-right">{h}</th>)}</tr></thead><tbody>{ledgerRows.map(r=><tr key={r.ledger} className="transition hover:bg-[#f3f4f8]"><td className="border-b border-[#edf2f7] px-3 py-[12px] text-[18px] font-semibold text-[#171717]">{r.ledger}</td><td className="border-b border-[#edf2f7] px-3 py-[12px]"><span className={`inline-flex rounded-[8px] px-3 py-1 text-[16px] font-semibold leading-none ring-1 ${typeBadgeClass(r.type)}`}>{r.type}</span></td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-right text-[18px] text-[#171717]">{formatMoney(r.debit)}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-right text-[18px] text-[#171717]">{formatMoney(r.credit)}</td><td className="border-b border-[#edf2f7] px-3 py-[12px] text-right text-[18px] font-bold text-[#00a846]">{formatMoney(r.balance)}</td></tr>)}{ledgerRows.length===0?<tr><td colSpan="5" className="px-3 py-10 text-center text-[16px] text-[#64748b]">No ledger summary found.</td></tr>:null}</tbody></table></div></article>}</div></section></>;
}
