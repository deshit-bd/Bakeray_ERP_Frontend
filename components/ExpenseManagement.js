"use client";

import { useEffect, useMemo, useState } from "react";

export const EXPENSES_STORAGE_KEY = "erp-expense-history";
const EXPENSE_CATEGORIES_STORAGE_KEY = "erp-expense-categories";
const BDT_SYMBOL = "\u09F3";

const defaultCategories = [];

export const expenseRecords = [];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US")}`;
}

function categoryAccent(category, index = 0) {
  const known = {
    Salary: {
      icon: "text-[#1d4fff]",
      chip: "bg-[#dbeafe] text-[#2563eb]",
      card: "text-[#1d4fff]",
    },
    Rent: {
      icon: "text-[#8a20ff]",
      chip: "bg-[#f3dcff] text-[#7e22ce]",
      card: "text-[#8a20ff]",
    },
    Electric: {
      icon: "text-[#d98a00]",
      chip: "bg-[#fff2b8] text-[#b77900]",
      card: "text-[#d98a00]",
    },
    Transport: {
      icon: "text-[#00a846]",
      chip: "bg-[#d6f7df] text-[#079849]",
      card: "text-[#00a846]",
    },
    Internet: {
      icon: "text-[#f04400]",
      chip: "bg-[#ffe7cf] text-[#e44800]",
      card: "text-[#f04400]",
    },
  };

  const fallback = [
    { icon: "text-[#2563eb]", chip: "bg-[#dbeafe] text-[#2563eb]", card: "text-[#2563eb]" },
    { icon: "text-[#9333ea]", chip: "bg-[#f3dcff] text-[#9333ea]", card: "text-[#9333ea]" },
    { icon: "text-[#ca8a04]", chip: "bg-[#fef3c7] text-[#a16207]", card: "text-[#ca8a04]" },
    { icon: "text-[#16a34a]", chip: "bg-[#dcfce7] text-[#15803d]", card: "text-[#16a34a]" },
    { icon: "text-[#ea580c]", chip: "bg-[#ffedd5] text-[#c2410c]", card: "text-[#ea580c]" },
  ];

  return known[category] || fallback[index % fallback.length];
}

function normalizeExpense(item, index) {
  const description = item.description || item.note || "";

  return {
    id: item.id || `EXP-${index + 1}`,
    type: item.type || item.category || "Salary",
    amount: Number(item.amount || 0),
    date: item.date || todayDate(),
    paidTo: item.paidTo || item.paidToName || "",
    description,
    note: description,
  };
}

function isLegacyDefaultExpenses(items) {
  return (
    items.length === 4 &&
    items[0]?.id === "EXP-001" &&
    items[0]?.date === "2026-04-01" &&
    items[0]?.note === "Monthly staff salary"
  );
}

function loadExpenses() {
  if (typeof window === "undefined") return expenseRecords;

  try {
    const saved = window.localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!saved) return expenseRecords;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return expenseRecords;
    if (isLegacyDefaultExpenses(parsed)) return expenseRecords;

    return parsed.map(normalizeExpense);
  } catch {
    return expenseRecords;
  }
}

function loadCategories(expenses) {
  if (typeof window === "undefined") return defaultCategories;

  try {
    const saved = window.localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(String).filter(Boolean);
      }
    }
  } catch {
    // Fall back to default categories below.
  }

  const expenseCategories = expenses.map((expense) => expense.type).filter(Boolean);
  return Array.from(new Set([...defaultCategories, ...expenseCategories]));
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h16v13H4z" />
      <path d="M8 6V4h4l1.5 2" />
      <path d="M8 12h8" />
      <path d="M12 9v6" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 16 10 10l4 4 6-7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#a4a9b5]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#51596a]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function CategoryChip({ category, index, onDelete }) {
  const accent = categoryAccent(category, index);

  return (
    <span className={`inline-flex items-center gap-2 rounded-[8px] px-3 py-1 text-[14px] font-semibold ${accent.chip}`}>
      {category}
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(category)}
          className="grid h-4 w-4 place-items-center rounded-full transition hover:bg-black/10"
          aria-label={`Delete ${category}`}
        >
          <span className="text-[14px] leading-none">x</span>
        </button>
      ) : null}
    </span>
  );
}

function CategorySelect({ value, options, onChange }) {
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

function ExpenseCard({ category, amount, index }) {
  const accent = categoryAccent(category, index);

  return (
    <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-9 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[18px] font-semibold text-[#4b5c78]">{category}</p>
        <span className={`text-[28px] leading-none ${accent.icon}`}>{BDT_SYMBOL}</span>
      </div>
      <p className="mt-12 text-[30px] font-bold leading-none text-[#0b0b0d]">
        {formatMoney(amount)}
      </p>
    </article>
  );
}

function createExpenseForm(categories) {
  return {
    type: categories[0] || "Salary",
    amount: "",
    paidTo: "",
    description: "",
  };
}

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState(expenseRecords);
  const [categories, setCategories] = useState(defaultCategories);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(() => createExpenseForm(defaultCategories));
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const storedExpenses = loadExpenses();
    const storedCategories = loadCategories(storedExpenses);

    setExpenses(storedExpenses);
    setCategories(storedCategories);
    setExpenseForm(createExpenseForm(storedCategories));
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }, [categories, isStorageReady]);

  const categoryTotals = useMemo(() => {
    const totals = new Map(categories.map((category) => [category, 0]));

    expenses.forEach((expense) => {
      const type = expense.type || "Salary";
      totals.set(type, Number(totals.get(type) || 0) + Number(expense.amount || 0));
    });

    return totals;
  }, [categories, expenses]);

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [expenses]
  );

  const canAddCategory = Boolean(categoryName.trim());
  const canSaveExpense =
    expenseForm.type &&
    Number(expenseForm.amount) > 0 &&
    expenseForm.paidTo.trim() &&
    expenseForm.description.trim();

  const updateExpenseField = (field, value) => {
    setExpenseForm((current) => ({ ...current, [field]: value }));
  };

  const openExpenseModal = () => {
    setExpenseForm(createExpenseForm(categories));
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setExpenseForm(createExpenseForm(categories));
  };

  const openCategoryModal = () => {
    setCategoryName("");
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCategoryName("");
  };

  const handleAddCategory = (event) => {
    event.preventDefault();
    const nextCategory = categoryName.trim();
    if (!nextCategory) return;

    setCategories((current) => {
      const exists = current.some(
        (category) => category.toLowerCase() === nextCategory.toLowerCase()
      );
      return exists ? current : [...current, nextCategory];
    });
    setExpenseForm((current) => ({ ...current, type: nextCategory }));
    setCategoryName("");
  };

  const handleDeleteCategory = (categoryToDelete) => {
    const nextCategories = categories.filter((category) => category !== categoryToDelete);
    setCategories(nextCategories);
    setExpenseForm((form) => ({
      ...form,
      type: form.type === categoryToDelete ? nextCategories[0] || "" : form.type,
    }));
  };

  const handleSaveExpense = (event) => {
    event.preventDefault();
    if (!canSaveExpense) return;

    const description = expenseForm.description.trim();
    const newExpense = {
      id: `EXP-${Date.now()}`,
      type: expenseForm.type,
      amount: Number(expenseForm.amount),
      date: todayDate(),
      paidTo: expenseForm.paidTo.trim(),
      description,
      note: description,
    };

    setExpenses((previous) => [newExpense, ...previous]);
    closeExpenseModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
                Expenses
              </h1>
              <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
                Track all business expenses by category
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openCategoryModal}
                className="inline-flex h-[45px] items-center justify-center gap-5 rounded-[8px] border border-[#dde2ea] bg-white px-5 text-[18px] font-semibold text-[#171717] transition hover:bg-[#f7f8fb]"
              >
                <CategoryIcon />
                <span>Add Category</span>
              </button>

              <button
                type="button"
                onClick={openExpenseModal}
                className="inline-flex h-[45px] items-center justify-center gap-5 rounded-[8px] bg-[#523cf0] px-5 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
              >
                <PlusIcon />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category, index) => (
              <ExpenseCard
                key={category}
                category={category}
                amount={categoryTotals.get(category) || 0}
                index={index}
              />
            ))}

            <article className="rounded-[16px] border border-[#ffb4b4] bg-[#fff4f1] px-[30px] py-9 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[18px] font-semibold text-[#ba0000]">Total</p>
                <span className="text-[#ff0000]">
                  <TrendIcon />
                </span>
              </div>
              <p className="mt-12 text-[30px] font-bold leading-none text-[#c80000]">
                {formatMoney(totalExpenses)}
              </p>
            </article>
          </div>

          <article className="mt-8 rounded-[16px] border border-[#dde2ea] bg-white px-7 py-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Expense History</h2>

            <div className="mt-[34px] overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-[#f4f4f6]">
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Date
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Category
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Paid To
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Description
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <tr key={expense.id}>
                      <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] text-[#171717]">
                        {expense.date}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[11px]">
                        <CategoryChip category={expense.type} index={index} />
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] font-semibold text-[#171717]">
                        {expense.paidTo || "-"}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[11px] text-[18px] text-[#4b5c78]">
                        {expense.description || expense.note}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[11px] text-right text-[18px] font-bold text-[#ff0000]">
                        {formatMoney(expense.amount)}
                      </td>
                    </tr>
                  ))}

                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                        No expense found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {isCategoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-1">
          <div className="my-1 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">
                  Add New Expense Category
                </h2>
                <p className="mt-3 text-[18px] text-[#727789]">
                  Create a custom expense category
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mt-5 space-y-5">
              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Category Name
                </span>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="e.g., Marketing, Maintenance, Insurance"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="rounded-[8px] bg-[#f6f9fd] p-4">
                <p className="mb-3 text-[16px] font-semibold text-[#344054]">
                  Existing Categories:
                </p>
                <div className="flex flex-wrap gap-3">
                  {categories.map((category, index) => (
                    <CategoryChip
                      key={category}
                      category={category}
                      index={index}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                  {categories.length === 0 ? (
                    <span className="text-[15px] text-[#64748b]">No categories yet.</span>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!canAddCategory}
                  className={`h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition ${
                    canAddCategory ? "hover:bg-[#4632df]" : "cursor-not-allowed opacity-70"
                  }`}
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isExpenseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-4">
          <div className="my-0 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">
                  Add New Expense
                </h2>
                <p className="mt-3 text-[18px] text-[#727789]">
                  Record a new expense transaction
                </p>
              </div>

              <button
                type="button"
                onClick={closeExpenseModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="mt-5 space-y-[18px]">
              <div className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Expense Category
                </span>
                <CategorySelect
                  value={expenseForm.type}
                  options={categories}
                  onChange={(value) => updateExpenseField("type", value)}
                />
              </div>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Amount ({BDT_SYMBOL})
                </span>
                <input
                  type="number"
                  min="0"
                  value={expenseForm.amount}
                  onChange={(event) => updateExpenseField("amount", event.target.value)}
                  placeholder="Enter amount"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Paid To
                </span>
                <input
                  type="text"
                  value={expenseForm.paidTo}
                  onChange={(event) => updateExpenseField("paidTo", event.target.value)}
                  placeholder="e.g., Employees, Landlord, DESCO"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
                  Description
                </span>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(event) => updateExpenseField("description", event.target.value)}
                  placeholder="Expense details"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!canSaveExpense}
                  className={`h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition ${
                    canSaveExpense ? "hover:bg-[#4632df]" : "cursor-not-allowed opacity-70"
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
