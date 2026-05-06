"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";

export const RAW_MATERIALS_STORAGE_KEY = "erp-raw-materials";

const materialOptions = [];
const supplierOptions = [];

export const defaultMaterials = [];

function formatTaka(amount) {
  return <><span className="currency-symbol">৳</span>{Number(amount || 0).toLocaleString("en-US")}</>;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function loadMaterials() {
  if (typeof window === "undefined") return defaultMaterials;

  try {
    const stored = window.localStorage.getItem(RAW_MATERIALS_STORAGE_KEY);
    if (!stored) return defaultMaterials;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return defaultMaterials;

    return parsed.map((material, index) => ({
      id: material.id || `RM-${String(index + 1).padStart(3, "0")}`,
      name: material.name || materialOptions[index % materialOptions.length],
      supplier: material.supplier || "",
      quantity: Number(material.quantity || 0),
      unit: material.unit || "kg",
      costPerUnit: Number(material.costPerUnit || 0),
      minStock: Number(material.minStock || 0),
      maxStock: Number(material.maxStock || 0),
    }));
  } catch {
    return defaultMaterials;
  }
}

function nextMaterialId(materials) {
  const nextNumber =
    materials.reduce((max, material) => {
      const value = Number(String(material.id || "").replace("RM-", ""));
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0) + 1;
  return `RM-${String(nextNumber).padStart(3, "0")}`;
}

function createEmptyMaterialForm() {
  return { name: "", supplier: "", unit: "kg", costPerUnit: "0" };
}

function createEditMaterialForm(material) {
  return {
    id: material.id,
    name: material.name || "",
    supplier: material.supplier || "",
    unit: material.unit || "kg",
    costPerUnit: String(material.costPerUnit ?? 0),
    minStock: String(material.minStock ?? 0),
    maxStock: String(material.maxStock ?? 0),
  };
}

function RawMaterialsRow({ material, index, onEdit }) {
  const totalValue = Number(material.quantity || 0) * Number(material.costPerUnit || 0);

  return (
    <tr className={`${index % 2 === 1 ? "bg-[#f7f7f9]" : "bg-white"} border-b border-[#e5e7eb] last:border-b-0`}>
      <td className="px-10 py-4 text-[17px] font-semibold text-[#18181b]">{material.name}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{material.supplier}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{material.quantity}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{material.unit}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{formatTaka(material.costPerUnit)}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{formatTaka(totalValue)}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{material.minStock} {material.unit}</td>
      <td className="px-7 py-4 text-[16px] text-[#18181b]">{material.maxStock} {material.unit}</td>
      <td className="px-7 py-4 text-right">
        <button type="button" onClick={() => onEdit(material)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-black transition hover:bg-[#f1f5f9]" aria-label={`Edit ${material.name}`}>
          <EditIcon />
        </button>
      </td>
    </tr>
  );
}

function FormInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[18px] font-medium text-[#171717]">{label}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[16px] text-[#171717] outline-none placeholder:text-[#74788d] focus:ring-2 focus:ring-[#5b4ce6]/25"
      />
    </label>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[18px] font-medium text-[#171717]">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="h-[46px] w-full appearance-none rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[16px] font-semibold text-[#171717] outline-none focus:ring-2 focus:ring-[#5b4ce6]/25"
        style={{ backgroundImage: "linear-gradient(45deg, transparent 50%, #9ca3af 50%), linear-gradient(135deg, #9ca3af 50%, transparent 50%)", backgroundPosition: "calc(100% - 22px) 19px, calc(100% - 16px) 19px", backgroundSize: "6px 6px, 6px 6px", backgroundRepeat: "no-repeat" }}
      >
        {children}
      </select>
    </label>
  );
}

export default function RawMaterialsManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [materials, setMaterials] = useState(defaultMaterials);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState(createEmptyMaterialForm);
  const [editForm, setEditForm] = useState(null);

  const unitOptions = useMemo(() => {
    const seen = new Set();

    return [
      ...(settings.units || []),
      ...materials.map((material) => material.unit),
      materialForm.unit,
      editForm?.unit,
    ]
      .map((unit) => String(unit || "").trim())
      .filter((unit) => {
        const key = unit.toLowerCase();
        if (!unit || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [editForm?.unit, materialForm.unit, materials, settings.units]);

  useEffect(() => {
    setMaterials(loadMaterials());
    setIsStorageReady(true);
  }, []);

  useEffect(() => subscribeSystemSettings(setSettings), []);

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return;
    window.localStorage.setItem(RAW_MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  }, [materials, isStorageReady]);

  const materialRows = useMemo(() => materials, [materials]);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setMaterialForm(createEmptyMaterialForm());
  };

  const openEditModal = (material) => {
    setEditingMaterial(material);
    setEditForm(createEditMaterialForm(material));
  };

  const closeEditModal = () => {
    setEditingMaterial(null);
    setEditForm(null);
  };

  const saveMaterial = (event) => {
    event.preventDefault();
    if (!materialForm.name) return;

    const nextMaterial = {
      id: nextMaterialId(materials),
      name: materialForm.name,
      supplier: materialForm.supplier || "",
      quantity: 0,
      unit: materialForm.unit || "kg",
      costPerUnit: Number(materialForm.costPerUnit || 0),
      minStock: 0,
      maxStock: 0,
    };

    setMaterials((current) => [...current, nextMaterial]);
    closeAddModal();
  };

  const updateMaterial = (event) => {
    event.preventDefault();
    if (!editForm?.id) return;

    setMaterials((current) =>
      current.map((material) =>
        material.id === editForm.id
          ? {
              ...material,
              name: editForm.name || material.name,
              supplier: editForm.supplier || "",
              unit: editForm.unit || "kg",
              costPerUnit: Number(editForm.costPerUnit || 0),
              minStock: Number(editForm.minStock || 0),
              maxStock: Number(editForm.maxStock || 0),
            }
          : material
      )
    );
    closeEditModal();
  };

  return (
    <>
      <section className="min-w-0 flex-1 bg-[#f5f7fb] px-4 py-5 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-[#111827]">Raw Materials</h1>
              <p className="mt-2 text-[19px] text-[#64748b]">Manage your raw material inventory</p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-3 self-start rounded-[10px] bg-[#4f46f6] px-6 py-3 text-[18px] font-semibold text-white transition hover:bg-[#4338ca]"
            >
              <PlusIcon />
              <span>Add Material</span>
            </button>
          </div>

          <article className="mt-9 overflow-hidden rounded-[17px] border border-[#dddddf] bg-white">
            <div className="px-8 pb-8 pt-7">
              <h2 className="text-[20px] font-semibold text-[#171717]">Material Inventory</h2>

              <div className="mt-10 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-left">
                      <th className="border-b border-[#e5e7eb] px-10 py-3 text-[18px] font-semibold text-[#18181b]">Name</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Supplier</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Quantity</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Unit</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Cost/Unit</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Total Value</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Min Stock</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-[18px] font-semibold text-[#18181b]">Max Stock</th>
                      <th className="border-b border-[#e5e7eb] px-7 py-3 text-right text-[18px] font-semibold text-[#18181b]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((material, index) => (
                      <RawMaterialsRow key={material.id || material.name} material={material} index={index} onEdit={openEditModal} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>
      </section>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white px-8 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold text-[#171717]">Add New Material</h2>
                <p className="mt-2 text-[18px] text-[#74788d]">Add a new raw material to inventory</p>
              </div>
              <button type="button" onClick={closeAddModal} className="grid h-8 w-8 place-items-center rounded-full text-[#4b5563] transition hover:bg-[#f3f4f6]" aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={saveMaterial} className="mt-5 space-y-5">
              <FormSelect
                label="Material Name"
                value={materialForm.name}
                onChange={(event) => setMaterialForm((current) => ({ ...current, name: event.target.value }))}
              >
                <option value="">Select material</option>
                {materialOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </FormSelect>

              <FormSelect
                label="Supplier"
                value={materialForm.supplier}
                onChange={(event) => setMaterialForm((current) => ({ ...current, supplier: event.target.value }))}
              >
                {supplierOptions.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
              </FormSelect>

              <FormSelect
                label="Unit"
                value={materialForm.unit}
                onChange={(event) => setMaterialForm((current) => ({ ...current, unit: event.target.value }))}
              >
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </FormSelect>

              <label className="block">
                <span className="mb-1.5 block text-[18px] font-medium text-[#171717]">Cost per Unit (৳)</span>
                <input
                  type="number"
                  min="0"
                  value={materialForm.costPerUnit}
                  onChange={(event) => setMaterialForm((current) => ({ ...current, costPerUnit: event.target.value }))}
                  placeholder="0"
                  className="h-[46px] w-full rounded-[9px] border-0 bg-[#f1f1f4] px-4 text-[16px] text-[#171717] outline-none placeholder:text-[#74788d] focus:ring-2 focus:ring-[#5b4ce6]/25"
                />
              </label>

              <div className="flex justify-end pt-2">
                <button type="submit" className="h-[46px] rounded-[9px] bg-[#4f46f6] px-8 text-[18px] font-semibold text-white transition hover:bg-[#4338ca]">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMaterial && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-[8px] bg-white px-8 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-semibold text-[#171717]">Edit Material</h2>
                <p className="mt-2 text-[18px] text-[#74788d]">Update material information</p>
              </div>
              <button type="button" onClick={closeEditModal} className="grid h-8 w-8 place-items-center rounded-full text-[#4b5563] transition hover:bg-[#f3f4f6]" aria-label="Close edit material modal">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={updateMaterial} className="mt-5 space-y-5">
              <FormInput
                label="Material Name"
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Material name"
              />

              <FormSelect
                label="Supplier"
                value={editForm.supplier}
                onChange={(event) => setEditForm((current) => ({ ...current, supplier: event.target.value }))}
              >
                {supplierOptions.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
              </FormSelect>

              <FormSelect
                label="Unit"
                value={editForm.unit}
                onChange={(event) => setEditForm((current) => ({ ...current, unit: event.target.value }))}
              >
                {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </FormSelect>

              <FormInput
                label="Cost per Unit (৳)"
                type="number"
                value={editForm.costPerUnit}
                onChange={(event) => setEditForm((current) => ({ ...current, costPerUnit: event.target.value }))}
                placeholder="0"
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormInput
                  label="Min Stock"
                  type="number"
                  value={editForm.minStock}
                  onChange={(event) => setEditForm((current) => ({ ...current, minStock: event.target.value }))}
                  placeholder="0"
                />
                <FormInput
                  label="Max Stock"
                  type="number"
                  value={editForm.maxStock}
                  onChange={(event) => setEditForm((current) => ({ ...current, maxStock: event.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="h-[46px] rounded-[9px] bg-[#4f46f6] px-8 text-[18px] font-semibold text-white transition hover:bg-[#4338ca]">
                  Update Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
