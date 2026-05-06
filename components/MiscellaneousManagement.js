"use client";

import { useEffect, useMemo, useState } from "react";
import ModulePageShell from "./ModulePageShell";

export const MISCELLANEOUS_STORAGE_KEY = "erp-miscellaneous-items";
const BDT_SYMBOL = "\u09F3";

export const miscellaneousItems = [];

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US")}`;
}

function normalizeItem(item, index) {
  return {
    id: item.id || `MISC-${index + 1}`,
    name: item.name || item.item || item.service || "Miscellaneous Expense",
    amount: Number(item.amount || 0),
    date: item.date || todayDate(),
    note: item.note || item.notes || item.description || "",
  };
}

function isLegacyDefaultItems(items) {
  return (
    items.length === 3 &&
    items[0]?.id === "MISC-001" &&
    items[0]?.name === "Tea & Snacks" &&
    Number(items[0]?.amount || 0) === 500
  );
}

function loadMiscellaneousItems() {
  if (typeof window === "undefined") return miscellaneousItems;

  try {
    const saved = window.localStorage.getItem(MISCELLANEOUS_STORAGE_KEY);
    if (!saved) return miscellaneousItems;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return miscellaneousItems;
    if (isLegacyDefaultItems(parsed)) return miscellaneousItems;

    return parsed.map(normalizeItem);
  } catch {
    return miscellaneousItems;
  }
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

function WrenchIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a4 4 0 0 0 5 5L10 21l-5-5 9.7-9.7Z" />
      <path d="m8.5 17.5-2-2" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 16 6-6 4 4 6-7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function SummaryCard({ title, value, caption, icon, valueClassName = "text-[#0b0b0d]" }) {
  return (
    <article className="min-h-[192px] rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[34px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[18px] font-semibold text-[#4b5c78]">{title}</p>
        <span className="shrink-0">{icon}</span>
      </div>
      <p className={`mt-12 text-[30px] font-bold leading-none ${valueClassName}`}>
        {value}
      </p>
      <p className="mt-3 text-[16px] leading-5 text-[#4b5c78]">{caption}</p>
    </article>
  );
}

function createForm() {
  return {
    name: "",
    amount: "",
    note: "",
  };
}

export default function MiscellaneousManagement() {
  const [items, setItems] = useState(miscellaneousItems);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createForm);

  useEffect(() => {
    setItems(loadMiscellaneousItems());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(MISCELLANEOUS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Keep the UI usable if browser storage is unavailable.
    }
  }, [items, isStorageReady]);

  const totalExpenses = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [items]
  );

  const thisMonthExpenses = useMemo(() => {
    const currentMonth = todayDate().slice(0, 7);
    return items
      .filter((item) => String(item.date || "").slice(0, 7) === currentMonth)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  const canSave = Boolean(
    form.name.trim() &&
      Number(form.amount) > 0 &&
      form.note.trim()
  );

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const openModal = () => {
    setForm(createForm());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(createForm());
  };

  const handleSaveItem = (event) => {
    event.preventDefault();
    if (!canSave) return;

    const newItem = {
      id: `MISC-${Date.now()}`,
      name: form.name.trim(),
      amount: Number(form.amount),
      date: todayDate(),
      note: form.note.trim(),
    };

    setItems((previous) => [newItem, ...previous]);
    closeModal();
  };

  return (
    <>
      <ModulePageShell>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-[30px] font-bold leading-tight text-[#0f172a]">
              Miscellaneous
            </h1>
            <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
              Track tea, repair, emergency, and other miscellaneous expenses
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex h-[45px] items-center justify-center gap-5 self-start rounded-[8px] bg-[#523cf0] px-5 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
          >
            <PlusIcon />
            <span>Add Expense</span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard
            title="This Month"
            value={formatCurrency(thisMonthExpenses)}
            caption="Current month expenses"
            icon={<span className="text-[#523cf0]"><WrenchIcon /></span>}
          />
          <SummaryCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses)}
            caption="All time"
            icon={<span className="text-[#ff001f]"><TrendIcon /></span>}
            valueClassName="text-[#ff001f]"
          />
          <SummaryCard
            title="Total Items"
            value={items.length.toLocaleString("en-US")}
            caption="Expense records"
            icon={<span className="text-[#4b5c78]"><WrenchIcon /></span>}
          />
        </div>

        <article className="rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h2 className="text-[20px] font-semibold text-[#171717]">
            Miscellaneous Expense History
          </h2>

          <div className="mt-[34px] overflow-x-auto">
            <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Date
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Item/Service
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                    Notes
                  </th>
                  <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#f3f4f8]">
                    <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] text-[#171717]">
                      {item.date}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] font-semibold text-[#171717]">
                      {item.name}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] text-[#4b5c78]">
                      {item.note || "-"}
                    </td>
                    <td className="border-b border-[#edf2f7] px-3 py-[11px] text-right text-[18px] font-bold text-[#ff001f]">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {items.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                      No miscellaneous expense found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="flex gap-4 rounded-[16px] border border-[#ffcf4d] bg-[#fffaf0] px-7 py-8 text-[#d24b00] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fff0c2] text-[#e26a00]">
            <WrenchIcon />
          </span>
          <div>
            <h2 className="text-[20px] font-semibold text-[#963b00]">
              Miscellaneous Expenses
            </h2>
            <p className="mt-3 text-[18px] leading-6">
              Use this module to track flexible, one-time, or irregular expenses like
              office tea, equipment repairs, emergency purchases, cleaning supplies,
              and other items that don't fit into standard expense categories.
            </p>
          </div>
        </article>
      </ModulePageShell>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-2">
          <div className="my-0 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">
                  Add Miscellaneous Expense
                </h2>
                <p className="mt-3 text-[18px] text-[#727789]">
                  Record a miscellaneous expense item
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

            <form onSubmit={handleSaveItem} className="mt-5 space-y-[18px]">
              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Item/Service
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g., Tea & Snacks, Repair, Emergency"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Amount ({BDT_SYMBOL})
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  placeholder="Enter amount"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Notes
                </span>
                <textarea
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  placeholder="Additional details about this expense"
                  rows={3}
                  className="min-h-[80px] w-full resize-none rounded-[9px] border-0 bg-[#f0f0f3] px-4 py-3 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="flex justify-end pt-0.5">
                <button
                  type="submit"
                  disabled={!canSave}
                  className={`h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition ${
                    canSave ? "hover:bg-[#4632df]" : "cursor-not-allowed opacity-70"
                  }`}
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
