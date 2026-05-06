"use client";

import { useEffect, useMemo, useState } from "react";
import RawMaterialProductionPanel from "./RawMaterialProductionPanel";
import RepackingProductionPanel from "./RepackingProductionPanel";

const topTabs = ["Raw Material Production", "Repacking Production"];
const REPACKING_ORDERS_STORAGE_KEY = "erp-repacking-orders";

const initialOrders = [];

const emptyForm = {
  orderId: "",
  sourceProduct: "",
  sourceQty: "",
  targetProduct: "",
  targetQty: "",
  orderDate: "",
  completedDate: "",
  status: "Pending",
};

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

function PackageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 7 4-7 4-7-4 7-4Z" />
      <path d="m5 7 7 4 7-4" />
      <path d="M5 12l7 4 7-4" />
      <path d="M5 7v6l7 4 7-4V7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function formatDate(date) {
  if (!date) {
    return "-";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US");
}

function getStatusCount(orders, status) {
  return orders.filter((order) => order.status === status).length;
}

function statusChipClass(status) {
  if (status === "Completed") {
    return "bg-[#101323] text-white";
  }

  if (status === "In Progress") {
    return "border border-[#dbe3ef] bg-white text-[#344054]";
  }

  return "bg-[#f4f4f5] text-[#344054]";
}

function actionButtonClass(status) {
  if (status === "In Progress") {
    return "bg-[#12b76a] text-white hover:bg-[#0fa968]";
  }

  if (status === "Pending") {
    return "border border-[#dbe3ef] bg-white text-[#344054] hover:bg-[#f8fafc]";
  }

  return "border border-[#eaecf0] bg-[#f8fafc] text-[#98a2b3]";
}

function nextStatus(status) {
  if (status === "Pending") {
    return "In Progress";
  }

  if (status === "In Progress") {
    return "Completed";
  }

  return "Completed";
}

function actionLabel(status) {
  if (status === "In Progress") {
    return "Complete";
  }

  if (status === "Pending") {
    return "Start";
  }

  return "Done";
}

function loadRepackingOrders() {
  if (typeof window === "undefined") return initialOrders;

  try {
    const stored = window.localStorage.getItem(REPACKING_ORDERS_STORAGE_KEY);
    if (!stored) return initialOrders;

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : initialOrders;
  } catch {
    return initialOrders;
  }
}

function Field({ name, label, placeholder, type = "text", value, onChange, required = true }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] font-medium text-[#344054]">{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-12 w-full rounded-[14px] border border-[#e4eaf2] bg-white px-4 text-[14px] text-[#0f172a] outline-none placeholder:text-[#98a2b3] focus:border-[#2f66e3]"
      />
    </label>
  );
}

export default function RepackingManagement() {
  const [orders, setOrders] = useState(initialOrders);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState("Repacking Production");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setOrders(loadRepackingOrders());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(REPACKING_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [isStorageReady, orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return statusFilter === "All Status" || order.status === statusFilter;
    });
  }, [orders, statusFilter]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setOrders((current) => [...current, formData]);
    setFormData(emptyForm);
    setIsModalOpen(false);
  };

  const handleStatusAction = (orderId) => {
    setOrders((current) =>
      current.map((order) => {
        if (order.orderId !== orderId || order.status === "Completed") {
          return order;
        }

        const updatedStatus = nextStatus(order.status);

        return {
          ...order,
          status: updatedStatus,
          completedDate:
            updatedStatus === "Completed"
              ? new Date().toISOString().slice(0, 10)
              : order.completedDate,
        };
      })
    );
  };

  const summaryCards = [
    {
      label: "Total Orders",
      value: orders.length,
      color: "text-[#d0d5dd]",
      icon: PackageIcon,
    },
    {
      label: "Completed",
      value: getStatusCount(orders, "Completed"),
      color: "text-[#b7efe0]",
      valueClass: "text-[#12b76a]",
      icon: CheckIcon,
    },
    {
      label: "In Progress",
      value: getStatusCount(orders, "In Progress"),
      color: "text-[#bfd3ff]",
      valueClass: "text-[#2f66e3]",
      icon: ClockIcon,
    },
    {
      label: "Pending",
      value: getStatusCount(orders, "Pending"),
      color: "text-[#ffe1b3]",
      valueClass: "text-[#f79009]",
      icon: ClockIcon,
    },
  ];

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f4f7fc] p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a]">
                Repacking Management
              </h1>
              <p className="mt-1 text-[16px] text-[#64748b]">
                Manage product repacking and repackaging orders
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {topTabs.map((tab) => {
                const active = activeTopTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTopTab(tab)}
                    className={[
                      "inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-[14px] font-medium transition",
                      active
                        ? "bg-[#2f66e3] text-white shadow-[0_10px_24px_rgba(47,102,227,0.2)]"
                        : "border border-[#2f66e3] bg-white text-[#181d27] hover:bg-[#f8fbff]",
                    ].join(" ")}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTopTab === "Raw Material Production" ? (
            <div className="mt-5">
              <RawMaterialProductionPanel />
            </div>
          ) : (
            <div className="mt-5">
              <RepackingProductionPanel />
            </div>
          )}
        </div>
      </section>

      <div
        className={[
          "fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/50 p-4 backdrop-blur-[2px] transition",
          isModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="max-h-[90vh] w-full max-w-[920px] overflow-y-auto rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
          <div className="flex items-start justify-between border-b border-[#edf2f7] px-5 py-5 sm:px-6">
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0f172a]">
                New Repacking Order
              </h3>
              <p className="mt-1 text-[14px] text-[#64748b]">
                Fill in the order details to create a new repacking order.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full text-[#64748b] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                name="orderId"
                label="Order ID"
                placeholder="RPK-004"
                value={formData.orderId}
                onChange={handleChange}
              />
              <Field
                name="sourceProduct"
                label="Source Product"
                placeholder="Premium Rice (Bulk 25kg)"
                value={formData.sourceProduct}
                onChange={handleChange}
              />
              <Field
                name="sourceQty"
                label="Source Qty"
                placeholder="12 bags"
                value={formData.sourceQty}
                onChange={handleChange}
              />
              <Field
                name="targetProduct"
                label="Target Product"
                placeholder="Packed Rice (500g)"
                value={formData.targetProduct}
                onChange={handleChange}
              />
              <Field
                name="targetQty"
                label="Target Qty"
                placeholder="600 packets"
                value={formData.targetQty}
                onChange={handleChange}
              />
              <Field
                name="orderDate"
                label="Order Date"
                type="date"
                placeholder=""
                value={formData.orderDate}
                onChange={handleChange}
              />
              <Field
                name="completedDate"
                label="Completed Date"
                type="date"
                placeholder=""
                value={formData.completedDate}
                onChange={handleChange}
                required={false}
              />

              <label className="block">
                <span className="mb-2 block text-[14px] font-medium text-[#344054]">
                  Status
                </span>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="h-12 w-full rounded-[14px] border border-[#e4eaf2] bg-white px-4 text-[14px] text-[#0f172a] outline-none focus:border-[#2f66e3]"
                >
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="inline-flex items-center justify-center rounded-[12px] border border-[#dbe3ef] px-5 py-3 text-[14px] font-medium text-[#344054] transition hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-[12px] bg-[#2f66e3] px-5 py-3 text-[14px] font-medium text-white shadow-[0_14px_32px_rgba(47,102,227,0.24)] transition hover:bg-[#2459d6]"
              >
                Save Repacking Order
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
