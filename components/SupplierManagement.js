"use client";

import { useEffect, useMemo, useState } from "react";
import {
  displaySupplierType,
  formSupplierTypes,
  initialSuppliers,
  normalizeSupplierType,
  readSuppliers,
  saveSuppliers,
  supplierTypes,
  SUPPLIERS_STORAGE_KEY,
} from "../utils/supplierStore";

const statusOptions = ["Active", "Inactive"];

const emptyForm = {
  supplierName: "",
  phone: "",
  email: "",
  address: "",
  type: "Raw Material Supplier",
  openingBalance: "0",
  status: "Active",
};

export { initialSuppliers, SUPPLIERS_STORAGE_KEY };

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
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

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setSuppliers(readSuppliers());
    setIsStorageReady(true);
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    saveSuppliers(suppliers);
  }, [isStorageReady, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesType = typeFilter === "All Types" || normalizeSupplierType(supplier.type) === typeFilter;
      const searchableText = [
        supplier.supplierName,
        supplier.phone,
        supplier.email,
        supplier.address,
        supplier.type,
        supplier.status,
      ]
        .join(" ")
        .toLowerCase();

      return matchesType && (!query || searchableText.includes(query));
    });
  }, [searchQuery, suppliers, typeFilter]);

  const openAddModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    setFormData({
      supplierName: supplier.supplierName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      type: displaySupplierType(supplier.type),
      openingBalance: supplier.openingBalance ?? "0",
      status: supplier.status,
    });
    setEditingId(supplier.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (editingId) {
      setSuppliers((current) =>
        current.map((supplier) =>
          supplier.id === editingId ? { ...supplier, ...formData, type: normalizeSupplierType(formData.type) } : supplier
        )
      );
    } else {
      setSuppliers((current) => [
        {
          id: `SUP-${String(current.length + 1).padStart(3, "0")}`,
          ...formData,
          type: normalizeSupplierType(formData.type),
        },
        ...current,
      ]);
    }

    closeModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f8fafc] px-6 py-10">
        <div className="mx-auto max-w-[1080px]">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#0f172a]">
                Suppliers
              </h1>
              <p className="mt-2 text-[20px] leading-6 text-[#64748b]">
                Manage your supplier relationships
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-[10px] bg-[#4f46f7] px-5 text-[17px] font-semibold text-white shadow-sm transition hover:bg-[#4338ca]"
            >
              <PlusIcon />
              Add Supplier
            </button>
          </div>

          <div className="rounded-[16px] border border-[#e2e8f0] bg-white px-8 py-8">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-[20px] font-semibold text-[#111111]">Supplier List</h2>

              <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto">
                <div className="relative w-full sm:w-[320px]">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8aa1c3]">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search suppliers..."
                    className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f3] pl-12 pr-4 text-[16px] text-[#111827] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#c7d2fe]"
                  />
                </div>

                <div className="relative w-full sm:w-[250px]">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="h-[46px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f3] px-4 pr-11 text-[16px] font-semibold text-[#111111] outline-none focus:ring-2 focus:ring-[#c7d2fe]"
                  >
                    {supplierTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#9ca3af]">
                    <ChevronIcon />
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    {["Supplier Name", "Phone", "Email", "Address", "Type", "Status", "Action"].map((header) => (
                      <th
                        key={header}
                        className="border-b border-[#e5e7eb] px-3 pb-3 text-left text-[17px] font-semibold text-[#111111]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[17px] font-semibold text-[#171717]">
                        {supplier.supplierName}
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[16px] text-[#171717]">
                        {supplier.phone}
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[16px] text-[#171717]">
                        {supplier.email}
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4 text-[16px] text-[#171717]">
                        {supplier.address}
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4">
                        <span className="inline-flex rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-1 text-[14px] font-semibold text-[#262626]">
                          {displaySupplierType(supplier.type)}
                        </span>
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4">
                        <span className="inline-flex rounded-[9px] bg-[#dcfce7] px-3 py-1 text-[14px] font-semibold text-[#089141]">
                          {supplier.status}
                        </span>
                      </td>
                      <td className="border-b border-[#e5e7eb] px-3 py-4">
                        <button
                          type="button"
                          onClick={() => openEditModal(supplier)}
                          className="text-[#111111] transition hover:text-[#4f46f7]"
                          aria-label={`Edit ${supplier.supplierName}`}
                        >
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-3 py-10 text-center text-[15px] text-[#64748b]">
                        No suppliers found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <div
        className={[
          "fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4 transition",
          isModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white px-7 pb-7 pt-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[22px] font-bold leading-7 text-[#171717]">
                {editingId ? "Edit Supplier" : "Add New Supplier"}
              </h3>
              <p className="mt-3 text-[17px] leading-5 text-[#74788b]">Enter supplier details below</p>
            </div>
            <button type="button" onClick={closeModal} className="mt-[-6px] rounded-full p-1 text-[#555555] transition hover:bg-[#f1f1f3] hover:text-[#4f46f7]" aria-label="Close supplier popup">
              <CloseIcon />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-[14px]">
            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Supplier Name</label>
              <input required name="supplierName" value={formData.supplierName} onChange={handleChange} placeholder="Enter supplier name" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f3] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-2 focus:ring-[#c7d2fe]" />
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Phone Number</label>
              <input required name="phone" value={formData.phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f3] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-2 focus:ring-[#c7d2fe]" />
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="supplier@example.com" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f3] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-2 focus:ring-[#c7d2fe]" />
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Address</label>
              <input required name="address" value={formData.address} onChange={handleChange} placeholder="Enter address" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f3] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-2 focus:ring-[#c7d2fe]" />
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Supplier Type</label>
              <div className="relative">
                <select name="type" value={formData.type} onChange={handleChange} className="h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f3] px-4 pr-11 text-[16px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#c7d2fe]">
                  {formSupplierTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#c0c4d0]"><ChevronIcon /></span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Opening Balance (৳)</label>
              <input type="number" min="0" name="openingBalance" value={formData.openingBalance} onChange={handleChange} placeholder="0" className="h-[45px] w-full rounded-[9px] border-0 bg-[#f1f1f3] px-4 text-[16px] text-[#111827] outline-none placeholder:text-[#74788b] focus:ring-2 focus:ring-[#c7d2fe]" />
            </div>

            <div>
              <label className="mb-1 block text-[17px] font-semibold leading-5 text-[#171717]">Status</label>
              <div className="relative">
                <select name="status" value={formData.status} onChange={handleChange} className="h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f3] px-4 pr-11 text-[16px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#c7d2fe]">
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#c0c4d0]"><ChevronIcon /></span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="h-[45px] rounded-[9px] px-5 text-[16px] font-semibold text-[#4b5563] transition hover:bg-[#f1f1f3]">Cancel</button>
              <button type="submit" className="h-[45px] rounded-[9px] bg-[#4f46f7] px-5 text-[16px] font-semibold text-white transition hover:bg-[#4338ca]">Save Supplier</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
