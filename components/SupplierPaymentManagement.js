"use client";

import { useEffect, useMemo, useState } from "react";
import { flushDbKey } from "../lib/apiSync";
import {
  readPurchases,
  subscribePurchases,
} from "../utils/purchaseStore";
import {
  readSuppliers,
  subscribeSuppliers,
  supplierTypeToPurchaseType,
} from "../utils/supplierStore";

const BDT_SYMBOL = "\u09F3";
const SUPPLIER_PAYMENT_ACCOUNTS_KEY = "erp-supplier-payment-accounts";
const SUPPLIER_PAYMENT_HISTORY_KEY = "erp-supplier-payment-history";

const paymentMethods = ["Cash", "Bank Transfer", "Cheque", "Mobile Banking"];

const defaultSupplierAccounts = [];

const defaultPaymentHistory = [];

const emptyPaymentForm = {
  supplier: "",
  amount: "",
  method: "Cash",
  reference: "",
};

function formatMoney(value) {
  return `${BDT_SYMBOL}${Number(value || 0).toLocaleString("en-US")}`;
}

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function supplierDue(account) {
  return Math.max(Number(account.totalPurchase || 0) - Number(account.totalPaid || 0), 0);
}

function normalizeAccount(account, index) {
  return {
    id: account.id || `SUP-${String(index + 1).padStart(3, "0")}`,
    supplierName: account.supplierName || account.name || "Supplier",
    phone: account.phone || "",
    supplierType: account.supplierType || account.type || "-",
    totalPurchase: Number(account.totalPurchase || account.purchase || account.openingBalance || 0),
    totalPaid: Number(account.totalPaid || account.paid || 0),
  };
}

function buildSupplierTypeMap(purchases) {
  const supplierTypesByName = new Map();

  purchases.forEach((purchase) => {
    const supplierName = String(purchase.supplier || purchase.supplierName || "").trim();
    const supplierType = String(purchase.type || "").trim();
    if (!supplierName || !supplierType) return;

    const currentTypes = supplierTypesByName.get(supplierName) || [];
    if (!currentTypes.includes(supplierType)) {
      supplierTypesByName.set(supplierName, [...currentTypes, supplierType]);
    }
  });

  return supplierTypesByName;
}

function normalizePayment(payment, index) {
  return {
    id: payment.id || `SPY-${String(index + 1).padStart(3, "0")}`,
    date: payment.date || todayDate(),
    supplier: payment.supplier || payment.supplierName || "",
    method: payment.method || payment.paymentMethod || "Cash",
    reference: payment.reference || payment.note || "-",
    amount: Number(payment.amount || 0),
  };
}

function loadSavedJson(key) {
  if (typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function loadSupplierAccounts(purchases = readPurchases(), payments = loadPaymentHistory()) {
  const supplierTypeMap = buildSupplierTypeMap(purchases);
  const accountByName = new Map();

  readSuppliers().forEach((supplier, index) => {
    const supplierName = supplier.supplierName || supplier.name;
    if (!supplierName) return;

    accountByName.set(supplierName, {
      id: supplier.id || `SUP-L-${index + 1}`,
      supplierName,
      phone: supplier.phone || "",
      supplierType: supplier.type || "-",
      totalPurchase: Number(supplier.openingBalance || 0),
      totalPaid: 0,
    });
  });

  purchases.forEach((purchase) => {
    const supplierName = String(purchase.supplier || purchase.supplierName || "").trim();
    if (!supplierName) return;

    const current =
      accountByName.get(supplierName) ||
      {
        id: `SUP-P-${accountByName.size + 1}`,
        supplierName,
        phone: "",
        supplierType: "-",
        totalPurchase: 0,
        totalPaid: 0,
      };

    const purchaseTypes = supplierTypeMap.get(supplierName);
    accountByName.set(supplierName, {
      ...current,
      supplierType:
        purchaseTypes?.join(", ") ||
        supplierTypeToPurchaseType(current.supplierType) ||
        current.supplierType,
      totalPurchase: Number(current.totalPurchase || 0) + Number(purchase.cost || 0),
    });
  });

  supplierTypeMap.forEach((supplierTypes, supplierName) => {
    const supplierType = supplierTypes.join(", ");

    if (accountByName.has(supplierName)) {
      const current = accountByName.get(supplierName);
      accountByName.set(supplierName, {
        ...current,
        supplierType,
      });
      return;
    }

    accountByName.set(supplierName, {
      id: `SUP-P-${accountByName.size + 1}`,
      supplierName,
      phone: "",
      supplierType,
      totalPurchase: 0,
      totalPaid: 0,
    });
  });

  payments.forEach((payment) => {
    const supplierName = String(payment.supplier || payment.supplierName || "").trim();
    if (!supplierName) return;

    const current =
      accountByName.get(supplierName) ||
      {
        id: `SUP-PAY-${accountByName.size + 1}`,
        supplierName,
        phone: "",
        supplierType: "-",
        totalPurchase: 0,
        totalPaid: 0,
      };

    accountByName.set(supplierName, {
      ...current,
      totalPaid: Number(current.totalPaid || 0) + Number(payment.amount || 0),
    });
  });

  return Array.from(accountByName.values()).sort((left, right) =>
    left.supplierName.localeCompare(right.supplierName)
  );
}

function loadPaymentHistory() {
  const savedPayments = loadSavedJson(SUPPLIER_PAYMENT_HISTORY_KEY);
  if (Array.isArray(savedPayments) && savedPayments.length > 0) {
    return savedPayments.map(normalizePayment);
  }

  return [];
}

function generateReference(method, paymentCount) {
  const year = todayDate().slice(0, 4);
  const serial = String(paymentCount + 1).padStart(3, "0");

  if (method === "Bank Transfer") return `TXN-${year}-${serial}`;
  if (method === "Cheque") return `CHQ-${year}-${serial}`;
  if (method === "Mobile Banking") return `MBK-${year}-${serial}`;
  return `CASH-${year}-${serial}`;
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.08V12a9 9 0 1 1-5.34-8.23" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
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

function SummaryCard({ title, value, description, tone, icon }) {
  const toneClasses = {
    danger: "text-[#e60012]",
    warning: "text-[#d96c00]",
    success: "text-[#00a542]",
  };

  return (
    <article className="rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[34px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[17px] font-semibold leading-6 text-[#485b78]">{title}</h2>
        <span className={toneClasses[tone]}>{icon}</span>
      </div>
      <p className={`mt-12 text-[30px] font-bold leading-none ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-3 text-[15px] leading-5 text-[#465875]">{description}</p>
    </article>
  );
}

function StatusBadge({ due }) {
  const isPaid = due <= 0;
  return (
    <span className={`inline-flex min-w-[50px] justify-center rounded-[9px] px-3 py-1 text-[14px] font-semibold ${isPaid ? "bg-[#d5f8df] text-[#039143]" : "bg-[#ffe1e4] text-[#e60012]"}`}>
      {isPaid ? "Paid" : "Due"}
    </span>
  );
}

function SupplierTypeBadge({ type }) {
  return (
    <span className="inline-flex rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1 text-[14px] font-semibold text-[#334155]">
      {type || "-"}
    </span>
  );
}

function MethodBadge({ method }) {
  return (
    <span className="inline-flex rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-1 text-[14px] font-medium text-[#171717]">
      {method}
    </span>
  );
}

export default function SupplierPaymentManagement() {
  const [supplierAccounts, setSupplierAccounts] = useState(defaultSupplierAccounts);
  const [payments, setPayments] = useState(defaultPaymentHistory);
  const [purchases, setPurchases] = useState([]);
  const [supplierRefreshKey, setSupplierRefreshKey] = useState(0);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const currentPurchases = readPurchases();
    const currentPayments = loadPaymentHistory();

    setPurchases(currentPurchases);
    setPayments(currentPayments);
    setSupplierAccounts(loadSupplierAccounts(currentPurchases, currentPayments));
    setIsStorageReady(true);

    const unsubscribePurchases = subscribePurchases(setPurchases);
    const unsubscribeSuppliers = subscribeSuppliers(() =>
      setSupplierRefreshKey((current) => current + 1)
    );

    return () => {
      unsubscribePurchases();
      unsubscribeSuppliers();
    };
  }, []);

  useEffect(() => {
    setSupplierAccounts(loadSupplierAccounts(purchases, payments));
  }, [payments, purchases, supplierRefreshKey]);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(SUPPLIER_PAYMENT_HISTORY_KEY, JSON.stringify(payments));
  }, [isStorageReady, payments]);

  const totalDue = useMemo(
    () => supplierAccounts.reduce((sum, account) => sum + supplierDue(account), 0),
    [supplierAccounts]
  );

  const suppliersWithDue = useMemo(
    () => supplierAccounts.filter((account) => supplierDue(account) > 0).length,
    [supplierAccounts]
  );

  const paymentMonthKey = useMemo(() => {
    const latestPaymentDate = payments.reduce(
      (latest, payment) => (payment.date > latest ? payment.date : latest),
      payments[0]?.date || todayDate()
    );
    return latestPaymentDate.slice(0, 7);
  }, [payments]);

  const currentMonthPayments = useMemo(
    () => payments.filter((payment) => payment.date.slice(0, 7) === paymentMonthKey),
    [paymentMonthKey, payments]
  );

  const paidThisMonth = useMemo(
    () => currentMonthPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [currentMonthPayments]
  );

  const selectedPaymentAccount = useMemo(
    () => supplierAccounts.find((account) => account.supplierName === paymentForm.supplier) || null,
    [paymentForm.supplier, supplierAccounts]
  );

  const selectedDueAmount = supplierDue(selectedPaymentAccount || {});

  const updatePaymentForm = (field, value) => {
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const openPaymentModal = () => {
    setPaymentForm(emptyPaymentForm);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentForm(emptyPaymentForm);
  };

  const handleSubmitPayment = async (event) => {
    event.preventDefault();

    const amount = Number(paymentForm.amount);
    const selectedAccount = supplierAccounts.find((account) => account.supplierName === paymentForm.supplier);
    const currentDue = supplierDue(selectedAccount || {});
    if (!paymentForm.supplier || !Number.isFinite(amount) || amount <= 0) return;
    if (currentDue > 0 && amount > currentDue) {
      window.alert(`Payment amount cannot be greater than due amount (${formatMoney(currentDue)}).`);
      return;
    }

    const newPayment = {
      id: `SPY-${Date.now()}`,
      date: todayDate(),
      supplier: paymentForm.supplier,
      method: paymentForm.method,
      reference: paymentForm.reference.trim() || generateReference(paymentForm.method, payments.length),
      amount,
    };

    const nextPayments = [newPayment, ...payments];
    setPayments(nextPayments);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPLIER_PAYMENT_HISTORY_KEY, JSON.stringify(nextPayments));
      await flushDbKey(SUPPLIER_PAYMENT_HISTORY_KEY).catch(() => {});
    }

    closePaymentModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f8fafc] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1095px]">
          <div>
            <h1 className="text-[30px] font-bold leading-tight text-[#0f172a]">Supplier Payment</h1>
            <p className="mt-2 text-[20px] leading-6 text-[#64748b]">Manage supplier dues and payments</p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <SummaryCard
              title="Total Due"
              value={formatMoney(totalDue)}
              description="Across all suppliers"
              tone="danger"
              icon={<AlertCircleIcon />}
            />
            <SummaryCard
              title="Suppliers with Due"
              value={String(suppliersWithDue)}
              description="Pending payments"
              tone="warning"
              icon={<CardIcon />}
            />
            <SummaryCard
              title="Paid This Month"
              value={formatMoney(paidThisMonth)}
              description={`${currentMonthPayments.length} transactions`}
              tone="success"
              icon={<CheckCircleIcon />}
            />
          </div>

          <article className="mt-[30px] rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[20px] font-semibold text-[#171717]">Supplier Due List</h2>
              <button
                type="button"
                onClick={openPaymentModal}
                className="inline-flex h-[45px] items-center justify-center gap-5 rounded-[8px] bg-[#523cf0] px-5 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
              >
                <CardIcon />
                <span>Make Payment</span>
              </button>
            </div>

            <div className="mt-[36px] overflow-x-auto">
              <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr className="bg-[#f3f3f5]">
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Supplier Name</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Phone</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Supplier Type</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">Total Purchase</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">Total Paid</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">Due Amount</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-center text-[18px] font-semibold text-[#171717]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierAccounts.map((account) => {
                    const due = supplierDue(account);

                    return (
                      <tr key={account.id || account.supplierName}>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-[18px] font-semibold text-[#171717]">{account.supplierName}</td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-[18px] text-[#171717]">{account.phone || "-"}</td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px]"><SupplierTypeBadge type={account.supplierType} /></td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-right text-[18px] text-[#171717]">{formatMoney(account.totalPurchase)}</td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-right text-[18px] text-[#00a542]">{formatMoney(account.totalPaid)}</td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-right text-[18px] font-bold text-[#ff0000]">{formatMoney(due)}</td>
                        <td className="border-b border-[#e5e7eb] px-3 py-[12px] text-center"><StatusBadge due={due} /></td>
                      </tr>
                    );
                  })}

                  {supplierAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                        No supplier due found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="mt-[30px] rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[30px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-3">
              <span className="text-[#513cff]"><HistoryIcon /></span>
              <h2 className="text-[20px] font-semibold text-[#171717]">Payment History</h2>
            </div>

            <div className="mt-[36px] overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Date</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Supplier</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Payment Method</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">Reference</th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-right text-[18px] font-semibold text-[#171717]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="border-b border-[#e5e7eb] px-3 py-[11px] text-[18px] text-[#171717]">{payment.date}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-[11px] text-[18px] font-semibold text-[#171717]">{payment.supplier}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-[11px]"><MethodBadge method={payment.method} /></td>
                      <td className="border-b border-[#e5e7eb] px-3 py-[11px] font-mono text-[14px] text-[#405073]">{payment.reference}</td>
                      <td className="border-b border-[#e5e7eb] px-3 py-[11px] text-right text-[18px] font-bold text-[#00a542]">{formatMoney(payment.amount)}</td>
                    </tr>
                  ))}

                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                        No payment history found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {isPaymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-1">
          <div className="my-1 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">Make Supplier Payment</h2>
                <p className="mt-3 text-[18px] text-[#727789]">Record payment to supplier</p>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
                aria-label="Close supplier payment modal"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-5 space-y-[18px]">
              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Select Supplier</span>
                <span className="relative block">
                  <select
                    required
                    value={paymentForm.supplier}
                    onChange={(event) => updatePaymentForm("supplier", event.target.value)}
                    className={`h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f0f0f3] px-4 pr-11 text-[18px] font-semibold outline-none focus:ring-2 focus:ring-[#9d8df4]/30 ${paymentForm.supplier ? "text-[#171717]" : "text-[#74798a]"}`}
                  >
                    <option value="" disabled>Choose supplier</option>
                    {supplierAccounts.map((account) => (
                      <option key={account.id || account.supplierName} value={account.supplierName}>
                        {account.supplierName}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#b6bbc7]">
                    <ChevronIcon />
                  </span>
                </span>
              </label>

              {paymentForm.supplier ? (
                <div className="rounded-[9px] border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[17px] font-semibold text-[#171717]">Due Amount</span>
                    <span className="text-[20px] font-bold text-[#ff0000]">{formatMoney(selectedDueAmount)}</span>
                  </div>
                </div>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Payment Amount ({BDT_SYMBOL})</span>
                <input
                  required
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(event) => updatePaymentForm("amount", event.target.value)}
                  placeholder="Enter amount"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Payment Method</span>
                <span className="relative block">
                  <select
                    value={paymentForm.method}
                    onChange={(event) => updatePaymentForm("method", event.target.value)}
                    className="h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f0f0f3] px-4 pr-11 text-[18px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#9d8df4]/30"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#b6bbc7]">
                    <ChevronIcon />
                  </span>
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">Reference/Note (Optional)</span>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(event) => updatePaymentForm("reference", event.target.value)}
                  placeholder="e.g., TXN-001, Cheque #12345"
                  className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
                />
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
