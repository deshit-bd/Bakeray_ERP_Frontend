"use client";

import { useEffect, useMemo, useState } from "react";
import TableImportDialog from "./LazyTableImportDialog";
import { useTableImport } from "../hooks/useTableImport";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getNextPrefixedId, getRawCellValue, parseNumericValue } from "../utils/tableImport";

const customerTypes = ["Wholesaler", "Retailer"];
export const CUSTOMERS_STORAGE_KEY = "erp-customers";
export const CUSTOMER_ORDERS_STORAGE_KEY = "erp-customer-orders";
export const defaultCustomers = [];
const productOptions = ["Vanilla", "Biscuit", "Cake", "Toast", "Bread"];

export const initialOrders = [];

const emptyItem = {
  productName: "Vanilla",
  quantity: "1",
  unitPrice: "0",
};

const customerOrderImportColumns = [
  { key: "id", label: "ID", required: false, aliases: ["Order ID"] },
  { key: "productName", label: "Product Name", aliases: ["Product Items", "Items", "Item"] },
  { key: "customerName", label: "Customer Name", aliases: ["Company Name", "Customer"] },
  { key: "type", label: "Type", required: false, aliases: ["Customer Type", "Category"] },
  { key: "orderDate", label: "Order Date", aliases: ["Date"] },
  { key: "quantity", label: "Quantity", required: false, aliases: ["Qty"] },
  { key: "unitPrice", label: "Unit Price", required: false, aliases: ["Price", "Rate"] },
  { key: "receivedAmount", label: "Received Amount", required: false, aliases: ["Paid Amount", "Paid"] },
  { key: "actions", label: "Actions", required: false },
];

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

function FilterIcon() {
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
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function ArrowStepIcon() {
  return (
    <div className="hidden h-[160px] w-[56px] shrink-0 items-center justify-center rounded-[14px] border border-[#d9e8ff] bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] lg:flex">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 shrink-0"
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  );
}

function CubeIcon({ color, bgColor }) {
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-[14px]"
      style={{ backgroundColor: bgColor }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3 7 4-7 4-7-4 7-4Z" />
        <path d="m5 7 7 4 7-4" />
        <path d="M5 7v8l7 4 7-4V7" />
      </svg>
    </span>
  );
}

function ChevronIcon() {
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
      <path d="m9 6 6 6-6 6" />
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 20 8-8-4-4-8 8-1 5 5-1Z" />
      <path d="m14 6 4 4" />
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
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4h6v3" />
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function formatDisplayDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatMoney(amount) {
  return `TK ${Number(amount || 0).toFixed(2)}`;
}

function nextOrderId(orders) {
  return `OM-${String(orders.length + 1).padStart(3, "0")}`;
}

function normalizeCustomerType(type) {
  if (type === "Wholeseller") {
    return "Wholesaler";
  }

  return type || "Wholesaler";
}

function cloneItem(item = emptyItem) {
  return {
    productName: item.productName || "Vanilla",
    quantity: String(item.quantity ?? "1"),
    unitPrice: String(item.unitPrice ?? "0"),
  };
}

function normalizeOrder(order, customers) {
  const matchedCustomer = customers.find(
    (customer) =>
      customer.id === order.customerId ||
      customer.customerName === order.customerName
  );
  const items =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.map((item) => cloneItem(item))
      : [
          {
            productName: order.productName || "Vanilla",
            quantity: "1",
            unitPrice: String(order.unitPrice ?? "0"),
          },
        ];

  return {
    ...order,
    customerId: matchedCustomer?.id || order.customerId || "",
    customerName: matchedCustomer?.customerName || order.customerName || "",
    type: normalizeCustomerType(matchedCustomer?.type || order.type),
    receivedAmount: String(order.receivedAmount ?? ""),
    items,
    productName: items[0]?.productName || order.productName || "Vanilla",
  };
}

export default function CustomerOrderManagement() {
  const [orders, setOrders] = useState(
    initialOrders.map((order) => normalizeOrder(order, defaultCustomers))
  );
  const [customers, setCustomers] = useState(defaultCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 180);
  const [typeFilter, setTypeFilter] = useState("Wholesaler");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [formData, setFormData] = useState({
    customerId: "",
    orderDate: "2026-04-25",
    receivedAmount: "",
    items: [emptyItem],
  });

  const {
    inputRef: importInputRef,
    isDialogOpen: isImportDialogOpen,
    isLoading: isImportLoading,
    errorMessage: importErrorMessage,
    fileName: importFileName,
    preview: importPreview,
    openFilePicker: openImportFilePicker,
    handleFileChange: handleImportFileChange,
    closeDialog: closeImportDialog,
    confirmImport,
  } = useTableImport({
    columns: customerOrderImportColumns,
    existingRows: orders,
    transformRow: (row, { index, existingRows }) => {
      const customer = customers.find(
        (item) => item.customerName === row.customerName || item.id === row.customerName
      );
      const productName = row.productName || "Product";
      const quantity = row.quantity || "1";
      const unitPrice = row.unitPrice || "0";

      return normalizeOrder(
        {
          id: row.id || getNextPrefixedId(existingRows, "OM", "id", index),
          customerId: customer?.id || "",
          customerName: customer?.customerName || row.customerName,
          type: normalizeCustomerType(customer?.type || row.type),
          orderDate: row.orderDate || new Date().toISOString().slice(0, 10),
          receivedAmount: String(parseNumericValue(row.receivedAmount)),
          items: [{ productName, quantity: String(quantity), unitPrice: String(unitPrice) }],
          productName,
        },
        customers
      );
    },
    onApply: (nextRows) => setOrders(nextRows.map((order) => normalizeOrder(order, customers))),
  });

  useEffect(() => {
    const savedCustomers = window.localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    const savedOrders = window.localStorage.getItem(CUSTOMER_ORDERS_STORAGE_KEY);
    let activeCustomers = defaultCustomers;

    if (savedCustomers) {
      try {
        const parsedCustomers = JSON.parse(savedCustomers);
        if (Array.isArray(parsedCustomers)) {
          activeCustomers = parsedCustomers.map((customer) => ({
            ...customer,
            type: normalizeCustomerType(customer.type),
          }));
          setCustomers(activeCustomers);
        }
      } catch {}
    }

    if (savedOrders) {
      try {
        const parsedOrders = JSON.parse(savedOrders);
        if (Array.isArray(parsedOrders)) {
          setOrders(
            parsedOrders.map((order) =>
              normalizeOrder(order, activeCustomers)
            )
          );
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      CUSTOMER_ORDERS_STORAGE_KEY,
      JSON.stringify(orders)
    );
  }, [orders]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === formData.customerId),
    [customers, formData.customerId]
  );

  const orderTotal = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [formData.items]);

  const dueAmount = Math.max(orderTotal - Number(formData.receivedAmount || 0), 0);

  const viewingOrderTotal = useMemo(() => {
    if (!viewingOrder) {
      return 0;
    }

    return (viewingOrder.items || []).reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [viewingOrder]);

  const viewingOrderPaid = Number(viewingOrder?.receivedAmount || 0);
  const viewingOrderDue = Math.max(viewingOrderTotal - viewingOrderPaid, 0);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = [
        order.id,
        order.productName,
        order.customerName,
        order.companyName,
        order.phone,
        order.email,
        order.items,
        order.orderDate,
        order.status,
        order.type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());

      const matchesType = !typeFilter || order.type === typeFilter;
      const matchesFromDate = !fromDate || order.orderDate >= fromDate;
      const matchesToDate = !toDate || order.orderDate <= toDate;

      return matchesSearch && matchesType && matchesFromDate && matchesToDate;
    });
  }, [orders, debouncedSearchQuery, typeFilter, fromDate, toDate]);

  const openCreateModal = () => {
    setEditingOrderId(null);
    setFormData({
      customerId: customers[0]?.id || "",
      orderDate: new Date().toISOString().slice(0, 10),
      receivedAmount: "",
      items: [cloneItem()],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingOrderId(order.id);
    setFormData({
      customerId:
        order.customerId ||
        customers.find((customer) => customer.customerName === order.customerName)
          ?.id ||
        "",
      orderDate: order.orderDate,
      receivedAmount: String(order.receivedAmount ?? ""),
      items:
        Array.isArray(order.items) && order.items.length > 0
          ? order.items.map((item) => cloneItem(item))
          : [cloneItem({ productName: order.productName })],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrderId(null);
  };

  const openViewModal = (order) => {
    setViewingOrder(order);
  };

  const closeViewModal = () => {
    setViewingOrder(null);
  };

  const openDeleteModal = (order) => {
    setOrderToDelete(order);
  };

  const closeDeleteModal = () => {
    setOrderToDelete(null);
  };

  const clearDateFilters = () => {
    setFromDate("");
    setToDate("");
  };

  const confirmDeleteOrder = () => {
    if (!orderToDelete) {
      return;
    }

    setOrders((current) =>
      current.filter((order) => order.id !== orderToDelete.id)
    );
    setOrderToDelete(null);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItemRow = () => {
    setFormData((current) => ({
      ...current,
      items: [...current.items, cloneItem()],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSaveOrder = (event) => {
    event.preventDefault();

    if (!selectedCustomer) {
      return;
    }

    const items = formData.items.map((item) => cloneItem(item));
    const firstProduct = items[0]?.productName || "Product";

    if (editingOrderId) {
      setOrders((current) =>
        current.map((order) =>
          order.id === editingOrderId
            ? {
                ...order,
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.customerName,
                type: normalizeCustomerType(selectedCustomer.type),
                orderDate: formData.orderDate,
                receivedAmount: String(formData.receivedAmount || ""),
                items,
                productName: firstProduct,
              }
            : order
        )
      );
    } else {
      setOrders((current) => [
        {
          id: nextOrderId(current),
          customerId: selectedCustomer.id,
          productName: firstProduct,
          customerName: selectedCustomer.customerName,
          type: normalizeCustomerType(selectedCustomer.type),
          orderDate: formData.orderDate,
          receivedAmount: String(formData.receivedAmount || ""),
          items,
        },
        ...current,
      ]);
    }

    setTypeFilter(normalizeCustomerType(selectedCustomer.type));
    setIsModalOpen(false);
    setEditingOrderId(null);
  };

  return (
    <>
      <TableImportDialog
        title="Import Customer Order Data"
        columns={customerOrderImportColumns}
        isOpen={isImportDialogOpen}
        isLoading={isImportLoading}
        errorMessage={importErrorMessage}
        fileName={importFileName}
        preview={importPreview}
        onClose={closeImportDialog}
        onConfirm={confirmImport}
      />
      <section className="min-w-0 flex-1 bg-[#f6f8fc] px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#181d27]">
                Customer Order Management
              </h1>
              <p className="mt-1 text-[15px] text-[#667085]">
                Quick sales and invoice generation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openImportFilePicker}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#cfd7e6] bg-white px-4 text-[14px] font-medium text-[#1f2937] transition hover:border-[#bcc7da] hover:bg-[#f8fafc]"
              >
                <ExportIcon />
                Export
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportFileChange}
              />
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#2f66e3] px-4 text-[14px] font-medium text-white shadow-[0_10px_24px_rgba(47,102,227,0.2)] transition hover:bg-[#2459d6]"
              >
                <PlusIcon />
                Create Order
              </button>
            </div>
          </div>

          <div className="rounded-[22px] border border-[#dde5f1] bg-[linear-gradient(90deg,#eef4ff_0%,#f3f4ff_42%,#effaf4_100%)] p-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1 rounded-[16px] border border-[#dde5f1] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <CubeIcon color="#2563eb" bgColor="#e7f0ff" />
                <h2 className="mt-4 text-[18px] font-semibold text-[#181d27]">
                  Order From Customer
                </h2>
                <p className="mt-1 text-[14px] text-[#667085]">
                  It will add customer
                </p>
              </div>

              <ArrowStepIcon />

              <div className="w-full rounded-[16px] border border-[#dde5f1] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] lg:w-[250px] lg:shrink-0">
                <CubeIcon color="#9333ea" bgColor="#f3e8ff" />
                <h2 className="mt-4 text-[18px] font-semibold text-[#181d27]">
                  Sales and Invoice
                </h2>
                <p className="mt-1 text-[14px] text-[#667085]">Processing</p>
              </div>

              <ArrowStepIcon />

              <div className="min-w-0 flex-1 rounded-[16px] border border-[#dde5f1] bg-white px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <CubeIcon color="#16a34a" bgColor="#dcfce7" />
                <h2 className="mt-4 text-[18px] font-semibold text-[#181d27]">
                  Delivery
                </h2>
                <p className="mt-1 text-[14px] text-[#667085]">
                  Ready for delivery
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="relative w-full max-w-[540px]">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order ID, company, customer, phone, email, item, status, or date..."
                className="h-12 w-full rounded-[12px] border border-[#c9d4e5] bg-white pl-11 pr-4 text-[14px] text-[#344054] outline-none placeholder:text-[#98a2b3] focus:border-[#9db3de]"
              />
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-[620px]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <div className="inline-flex h-11 items-center gap-3 rounded-[10px] border border-[#d0d5dd] bg-[#ececec] px-4 text-[14px] font-medium text-[#4b5563]">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    {customerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <span className="text-[#111827]">
                    <ChevronIcon />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen((current) => !current)}
                  className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] font-medium text-[#344054] transition hover:bg-[#f8fafc]"
                >
                  <FilterIcon />
                  Filter
                </button>
              </div>

              {isFilterOpen ? (
                <div className="rounded-[16px] border border-[#dfe5ef] bg-white p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6f42ff]">
                        From
                      </span>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                        className="h-11 w-full rounded-[10px] border border-[#d0d5dd] bg-[#12091f] px-4 text-[14px] font-medium text-white outline-none [color-scheme:dark] focus:border-[#6f42ff]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6f42ff]">
                        To
                      </span>
                      <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(event) => setToDate(event.target.value)}
                        className="h-11 w-full rounded-[10px] border border-[#d0d5dd] bg-[#12091f] px-4 text-[14px] font-medium text-white outline-none [color-scheme:dark] focus:border-[#6f42ff]"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] text-[#667085]">
                      {fromDate || toDate
                        ? `Showing orders from ${fromDate || "start"} to ${toDate || "today"}`
                        : "Select a date range to filter orders."}
                    </p>

                    <button
                      type="button"
                      onClick={clearDateFilters}
                      className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[#d0d5dd] bg-white px-3 text-[13px] font-medium text-[#344054] transition hover:bg-[#f8fafc]"
                    >
                      Clear Date
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#dfe5ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f9fafb]">
                    {[
                      "ID",
                      "Product Name",
                      "Customer Name",
                      "Order date",
                      "Order details",
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
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="bg-white">
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#2347ff]">
                        {order.id}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] text-[#344054]">
                        {order.productName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-semibold text-[#2347ff]">
                        {order.customerName}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[14px] font-medium text-[#344054]">
                        {formatDisplayDate(order.orderDate)}
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4 text-[13px] font-semibold">
                        <button
                          type="button"
                          onClick={() => openViewModal(order)}
                          className="text-[#2347ff] underline underline-offset-2"
                        >
                          View
                        </button>
                      </td>
                      <td className="border-b border-[#eaecf0] px-4 py-4">
                        <div className="flex items-center gap-4 text-[#101828]">
                          <button
                            type="button"
                            onClick={() => openEditModal(order)}
                            className="transition hover:text-[#2f66e3]"
                            aria-label={`Edit ${order.id}`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(order)}
                            className="text-[#f04438] transition hover:text-[#d92d20]"
                            aria-label={`Delete ${order.id}`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-10 text-center text-[14px] text-[#667085]"
                      >
                        No customer orders found for this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </section>

      <div
        className={[
          "fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/45 p-4 transition",
          isModalOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[820px] rounded-[16px] bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[28px] font-semibold text-[#181d27]">
              {editingOrderId ? "Edit Customer Order" : "Create Customer Order"}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              className="text-[#101828] transition hover:text-[#667085]"
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>

          <form onSubmit={handleSaveOrder} className="mt-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#181d27]">
                  Customer
                </span>
                <select
                  required
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleFieldChange}
                  className="h-12 w-full rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#667085] outline-none focus:border-[#98a2b3]"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#181d27]">
                  Order Date
                </span>
                <input
                  required
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleFieldChange}
                  className="h-12 w-full rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#667085] outline-none focus:border-[#98a2b3]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-[#181d27]">
                  Get amount
                </span>
                <input
                  name="receivedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.receivedAmount}
                  onChange={handleFieldChange}
                  className="h-12 w-full rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#667085] outline-none focus:border-[#98a2b3]"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <h3 className="text-[22px] font-semibold text-[#181d27]">
                Order Items
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#10b981] px-4 text-[14px] font-medium text-white transition hover:bg-[#0ea271]"
              >
                + Add Item
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border border-[#e4e7ec]">
              <div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_44px] gap-4 bg-[#f9fafb] px-4 py-3 text-[13px] font-semibold text-[#475467]">
                <span>Product</span>
                <span>Quantity</span>
                <span>Unit Price</span>
                <span>Total</span>
                <span />
              </div>

              <div className="space-y-3 p-4">
                {formData.items.map((item, index) => {
                  const lineTotal =
                    Number(item.quantity || 0) * Number(item.unitPrice || 0);

                  return (
                    <div
                      key={`${index}-${item.productName}`}
                      className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr_44px] gap-4"
                    >
                      <select
                        value={item.productName}
                        onChange={(event) =>
                          handleItemChange(index, "productName", event.target.value)
                        }
                        className="h-11 rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#667085] outline-none focus:border-[#98a2b3]"
                      >
                        {productOptions.map((product) => (
                          <option key={product} value={product}>
                            {product}
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
                        className="h-11 rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#344054] outline-none focus:border-[#98a2b3]"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleItemChange(index, "unitPrice", event.target.value)
                        }
                        className="h-11 rounded-[10px] border border-[#d0d5dd] bg-white px-4 text-[14px] text-[#344054] outline-none focus:border-[#98a2b3]"
                      />

                      <div className="flex h-11 items-center rounded-[10px] border border-transparent px-1 text-[14px] text-[#181d27]">
                        {formatMoney(lineTotal)}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="inline-flex h-11 w-11 items-center justify-center text-[#f04438] transition hover:text-[#d92d20]"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-[#eaecf0] pt-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-4 text-[15px] text-[#181d27]">
                <span>
                  Total Amount:{" "}
                  <span className="font-semibold text-[#2563eb]">
                    {formatMoney(orderTotal)}
                  </span>
                </span>
                <span>
                  Due Amount:{" "}
                  <span className="font-semibold text-[#f04438]">
                    {formatMoney(dueAmount)}
                  </span>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#d0d5dd] bg-white px-5 text-[14px] font-medium text-[#181d27] transition hover:bg-[#f9fafb]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#2f66e3] px-6 text-[14px] font-medium text-white transition hover:bg-[#2459d6]"
                >
                  {editingOrderId ? "Edit And Save" : "Create Order"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-[60] flex items-center justify-center bg-[#101828]/45 p-4 transition",
          viewingOrder
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[820px] rounded-[16px] bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[28px] font-semibold text-[#181d27]">
              View Order
            </h2>
            <button
              type="button"
              onClick={closeViewModal}
              className="text-[#101828] transition hover:text-[#667085]"
              aria-label="Close view modal"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] border border-[#e4e7ec]">
            <div className="grid grid-cols-4 gap-4 bg-[#f9fafb] px-4 py-3 text-[13px] font-semibold text-[#475467]">
              <span>Items name</span>
              <span>Quantity</span>
              <span>Unit of price</span>
              <span>Total amount</span>
            </div>

            <div className="divide-y divide-[#eaecf0]">
              {(viewingOrder?.items || []).map((item, index) => {
                const lineTotal =
                  Number(item.quantity || 0) * Number(item.unitPrice || 0);

                return (
                  <div
                    key={`${item.productName}-${index}`}
                    className="grid grid-cols-4 gap-4 px-4 py-4 text-[14px] text-[#181d27]"
                  >
                    <span>{item.productName}</span>
                    <span>{item.quantity}</span>
                    <span>{item.unitPrice}</span>
                    <span className="font-semibold text-[#2563eb]">
                      {formatMoney(lineTotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-8 border-t border-[#eaecf0] pt-4 text-[15px] text-[#181d27]">
            <span>
              Total Amount:{" "}
              <span className="font-semibold text-[#2563eb]">
                {formatMoney(viewingOrderTotal)}
              </span>
            </span>
            <span>
              Pay Amount:{" "}
              <span className="font-semibold text-[#181d27]">
                {formatMoney(viewingOrderPaid)}
              </span>
            </span>
            <span>
              Due Amount:{" "}
              <span className="font-semibold text-[#f04438]">
                {formatMoney(viewingOrderDue)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        className={[
          "fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4 transition",
          orderToDelete
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="w-full max-w-[470px] rounded-[14px] bg-white p-5 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-[16px] font-semibold text-[#181d27]">
              Are you sure you want to cancel this customer order?
            </h2>
            <button
              type="button"
              onClick={closeDeleteModal}
              className="text-[#101828] transition hover:text-[#667085]"
              aria-label="Close delete modal"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#d0d5dd] bg-white text-[14px] font-medium text-[#181d27] transition hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteOrder}
              className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#ff3131] text-[14px] font-medium text-white transition hover:bg-[#eb1c1c]"
            >
              Yes, Delete Order
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
