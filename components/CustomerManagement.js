"use client";

import { useEffect, useMemo, useState } from "react";

export const CUSTOMERS_STORAGE_KEY = "erp-customers";

export const initialCustomers = [];

const emptyForm = {
  customerName: "",
  phone: "",
  email: "",
  address: "",
  type: "Wholesale",
};

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeType(type) {
  const text = String(type || "").toLowerCase();
  return text.includes("retail") ? "Retail" : "Wholesale";
}

function normalizeCustomer(customer, index) {
  const customerName =
    customer.customerName || customer.companyName || customer.name || `Customer ${index + 1}`;

  return {
    id: customer.id || `CU-${String(index + 1).padStart(3, "0")}`,
    date: customer.date || todayDate(),
    customerName,
    companyName: customer.companyName || customerName,
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    type: normalizeType(customer.type || customer.customerCategory),
  };
}

function isLegacyDefaultCustomers(customers) {
  return (
    customers.length === 3 &&
    customers[0]?.id === "CU-001" &&
    customers[0]?.customerName === "XYZ" &&
    customers[0]?.companyName === "Global Rice Imports Ltd"
  );
}

function loadCustomers() {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    if (isLegacyDefaultCustomers(parsed)) return [];

    return parsed.map(normalizeCustomer);
  } catch {
    return [];
  }
}

function nextCustomerId(customers) {
  const maxNumber = customers.reduce((max, customer) => {
    const matched = String(customer.id || "").match(/(\d+)$/);
    return matched ? Math.max(max, Number(matched[1])) : max;
  }, 0);

  return `CU-${String(maxNumber + 1).padStart(3, "0")}`;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 20 8-8-4-4-8 8-1 5 5-1Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function CustomersIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SummaryCard({ title, value, tone = "dark" }) {
  const valueClass =
    tone === "green" ? "text-[#00a846]" : tone === "purple" ? "text-[#523cf0]" : "text-[#0b0b0d]";
  const iconClass = tone === "green" ? "text-[#00a846]" : "text-[#523cf0]";

  return (
    <article className="min-h-[168px] rounded-[16px] border border-[#dde2ea] bg-white px-[30px] py-[34px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[18px] font-semibold text-[#4b5c78]">{title}</p>
        <span className={iconClass}>
          <CustomersIcon />
        </span>
      </div>
      <p className={`mt-12 text-[30px] font-bold leading-none ${valueClass}`}>
        {Number(value || 0).toLocaleString("en-US")}
      </p>
    </article>
  );
}

function TypeChip({ type }) {
  const isRetail = normalizeType(type) === "Retail";

  return (
    <span
      className={[
        "inline-flex rounded-[8px] px-3 py-1 text-[16px] font-semibold leading-none",
        isRetail ? "bg-[#d7fbe3] text-[#008c3b]" : "bg-[#e4e3ff] text-[#3324ef]",
      ].join(" ")}
    >
      {isRetail ? "Retail" : "Wholesale"}
    </span>
  );
}

function CustomerModal({ mode, form, onChange, onClose, onSubmit }) {
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-2">
      <div className="my-0 w-full max-w-[640px] rounded-[8px] bg-white px-[30px] pb-[30px] pt-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-semibold leading-tight text-[#171717]">
              {isEdit ? "Edit Customer" : "Add New Customer"}
            </h2>
            <p className="mt-3 text-[18px] text-[#727789]">
              {isEdit ? "Update customer information" : "Add a new customer to the system"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#525252] transition hover:bg-[#f3f4f6]"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-[18px]">
          <label className="block">
            <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
              Customer Name
            </span>
            <input
              required
              value={form.customerName}
              onChange={(event) => onChange("customerName", event.target.value)}
              placeholder="Enter customer name"
              className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
              Phone Number
            </span>
            <input
              required
              value={form.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              placeholder="+880 1711-111111"
              className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
              Email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="customer@email.com"
              className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[18px] font-semibold leading-6 text-[#171717]">
              Address
            </span>
            <input
              required
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
              placeholder="Enter address"
              className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[18px] text-[#171717] outline-none placeholder:text-[#74798a] focus:ring-2 focus:ring-[#9d8df4]/30"
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-[18px] font-semibold leading-6 text-[#171717]">
              Customer Type
            </legend>
            <div className="flex flex-wrap gap-7">
              {["Wholesale", "Retail"].map((type) => (
                <label key={type} className="inline-flex items-center gap-2 text-[20px] font-semibold text-[#171717]">
                  <input
                    type="radio"
                    name="customer-type"
                    checked={form.type === type}
                    onChange={() => onChange("type", type)}
                    className="h-5 w-5 accent-[#1687f7]"
                  />
                  {type}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end pt-0.5">
            <button
              type="submit"
              className="h-[45px] rounded-[8px] bg-[#523cf0] px-6 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
            >
              {isEdit ? "Update Customer" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setCustomers(loadCustomers());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers, isStorageReady]);

  const summary = useMemo(() => {
    const wholesale = customers.filter((customer) => normalizeType(customer.type) === "Wholesale").length;
    const retail = customers.filter((customer) => normalizeType(customer.type) === "Retail").length;

    return {
      total: customers.length,
      wholesale,
      retail,
    };
  }, [customers]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openAddModal = () => {
    setEditingCustomerId(null);
    setForm(emptyForm);
    setModalMode("add");
  };

  const openEditModal = (customer) => {
    setEditingCustomerId(customer.id);
    setForm({
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      type: normalizeType(customer.type),
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingCustomerId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalized = {
      customerName: form.customerName.trim(),
      companyName: form.customerName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      type: normalizeType(form.type),
    };

    if (modalMode === "edit" && editingCustomerId) {
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === editingCustomerId
            ? {
                ...customer,
                ...normalized,
              }
            : customer
        )
      );
    } else {
      setCustomers((current) => [
        {
          id: nextCustomerId(current),
          date: todayDate(),
          ...normalized,
        },
        ...current,
      ]);
    }

    closeModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-[#0f172a]">
                Customers
              </h1>
              <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
                Manage customer information and contacts
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-[45px] items-center justify-center gap-5 self-start rounded-[8px] bg-[#523cf0] px-5 text-[18px] font-semibold text-white transition hover:bg-[#4632df]"
            >
              <PlusIcon />
              <span>Add Customer</span>
            </button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <SummaryCard title="Total Customers" value={summary.total} />
            <SummaryCard title="Wholesale" value={summary.wholesale} tone="purple" />
            <SummaryCard title="Retail" value={summary.retail} tone="green" />
          </div>

          <article className="mt-[30px] rounded-[16px] border border-[#dde2ea] bg-white px-7 py-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <h2 className="text-[20px] font-semibold text-[#171717]">Customer Directory</h2>

            <div className="mt-[34px] overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Name
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Phone
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Email
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Address
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Type
                    </th>
                    <th className="border-b border-[#e5e7eb] px-3 py-[14px] text-[18px] font-semibold text-[#171717]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="transition hover:bg-[#f3f4f8]">
                      <td className="border-b border-[#edf2f7] px-3 py-[18px] text-[18px] font-semibold text-[#171717]">
                        {customer.customerName}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[18px] text-[18px] text-[#171717]">
                        {customer.phone}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[18px] text-[18px] text-[#171717]">
                        {customer.email}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[18px] text-[18px] text-[#171717]">
                        {customer.address}
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[18px]">
                        <TypeChip type={customer.type} />
                      </td>
                      <td className="border-b border-[#edf2f7] px-3 py-[18px]">
                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="grid h-9 w-9 place-items-center rounded-full text-[#171717] transition hover:bg-[#f1f5f9] hover:text-[#523cf0]"
                          aria-label={`Edit ${customer.customerName}`}
                        >
                          <PencilIcon />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-10 text-center text-[16px] text-[#64748b]">
                        No customers found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      {modalMode ? (
        <CustomerModal
          mode={modalMode}
          form={form}
          onChange={updateForm}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
