"use client";

import { useEffect, useMemo, useState } from "react";
import {
  makePacketSize,
  readSystemSettings,
  saveSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";

const tabs = [
  { key: "general", label: "General", icon: GearIcon },
  { key: "products", label: "Units & Products", icon: BoxIcon },
  { key: "roles", label: "User Roles", icon: UsersIcon },
  { key: "notifications", label: "Notifications", icon: BellIcon },
];

const permissionOptions = [
  "Dashboard",
  "Suppliers",
  "Supplier Payment",
  "Purchase",
  "Materials",
  "Factory Issue",
  "Production",
  "Packaging",
  "Bulk Mix Stock",
  "Finished Stock",
  "Repack Product",
  "Sales",
  "Customers",
  "Expenses",
  "Miscellaneous",
  "Reports",
  "Accounts",
  "Settings",
];

const roleSections = [
  {
    key: "manager",
    title: "Manager",
    description: "Select permissions for Manager role",
  },
  {
    key: "staff",
    title: "Staff",
    description: "Select permissions for Staff role",
  },
  {
    key: "factorySupervisor",
    title: "Factory Supervisor",
    description: "Select permissions for Factory Supervisor role",
  },
  {
    key: "salesExecutive",
    title: "Sales Executive",
    description: "Select permissions for Sales Executive role",
  },
];

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.04A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.04a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.04A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function Field({ label, value, onChange, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[18px] font-bold leading-6 text-[#171717]">{label}</span>
      {children || (
        <input
          value={value}
          onChange={onChange}
          className="h-[45px] w-full rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[17px] text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
        />
      )}
    </label>
  );
}

function SettingsCard({ title, children, className = "" }) {
  return (
    <article className={`rounded-[16px] border border-[#dedede] bg-white px-[30px] py-[30px] ${className}`}>
      <h2 className="text-[20px] font-bold text-[#171717]">{title}</h2>
      {children}
    </article>
  );
}

function normalizeList(values) {
  const seen = new Set();

  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function ListEditor({ title, items, addLabel, chipClassName, placeholder, onChange }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const addItem = () => {
    const cleanValue = newValue.trim();
    if (!cleanValue) return;
    onChange(normalizeList([...items, cleanValue]));
    setNewValue("");
    setIsAdding(false);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(items[index] || "");
    setIsAdding(false);
  };

  const updateItem = () => {
    const cleanValue = editingValue.trim();
    if (!cleanValue || editingIndex === null) return;
    onChange(normalizeList(items.map((item, index) => (index === editingIndex ? cleanValue : item))));
    setEditingIndex(null);
    setEditingValue("");
  };

  const removeItem = (indexToRemove) => {
    onChange(items.filter((_, index) => index !== indexToRemove));
    if (editingIndex === indexToRemove) {
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[18px] font-bold text-[#171717]">{title}</p>
        <button
          type="button"
          onClick={() => {
            setIsAdding((current) => !current);
            setEditingIndex(null);
          }}
          className="inline-flex h-[35px] items-center justify-center gap-3 self-start rounded-[9px] border border-[#dedede] bg-white px-4 text-[16px] font-semibold text-[#171717] transition hover:bg-[#f8fafc] sm:self-auto"
        >
          <PlusIcon />
          {addLabel}
        </button>
      </div>

      {isAdding ? (
        <div className="mt-4 flex max-w-[560px] flex-col gap-3 sm:flex-row">
          <input
            value={newValue}
            onChange={(event) => setNewValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder={placeholder}
            className="h-[42px] flex-1 rounded-[9px] border border-[#dedede] bg-[#f8f8fb] px-4 text-[16px] text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
            autoFocus
          />
          <button type="button" onClick={addItem} className="h-[42px] rounded-[9px] bg-[#523cf0] px-5 text-[16px] font-bold text-white">
            Add
          </button>
          <button type="button" onClick={() => setIsAdding(false)} className="h-[42px] rounded-[9px] border border-[#dedede] px-5 text-[16px] font-bold text-[#171717]">
            Cancel
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={`inline-flex min-h-[35px] items-center gap-2 rounded-full px-4 text-[16px] font-medium ${chipClassName}`}>
            {editingIndex === index ? (
              <>
                <input
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") updateItem();
                  }}
                  className="h-[28px] w-[130px] rounded-full bg-white/75 px-3 text-[15px] text-[#171717] outline-none"
                  autoFocus
                />
                <button type="button" onClick={updateItem} className="text-[13px] font-bold">Save</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => startEdit(index)} className="text-left">
                  {item}
                </button>
                <button type="button" onClick={() => removeItem(index)} className="grid h-5 w-5 place-items-center rounded-full bg-white/50" aria-label={`Remove ${item}`}>
                  <CloseIcon />
                </button>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-[24px] w-[40px] rounded-full transition",
        checked ? "bg-[#030316]" : "bg-[#d1d5db]",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span
        className={[
          "absolute top-[2px] h-5 w-5 rounded-full bg-white transition",
          checked ? "left-[18px]" : "left-[2px]",
        ].join(" ")}
      />
    </button>
  );
}

function PermissionCheckbox({ checked, label, onChange }) {
  return (
    <label className="inline-flex min-h-[32px] items-center gap-3 text-[18px] font-bold text-[#171717]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#0b7fd8]"
      />
      {label}
    </label>
  );
}

export default function SettingsManagement() {
  const [settings, setSettings] = useState(() => readSystemSettings());
  const [activeTab, setActiveTab] = useState("general");
  const [companyDraft, setCompanyDraft] = useState(() => readSystemSettings().company);
  const [notificationEmail, setNotificationEmail] = useState(() => readSystemSettings().notifications.email);

  useEffect(() => subscribeSystemSettings(setSettings), []);

  useEffect(() => {
    setCompanyDraft(settings.company);
    setNotificationEmail(settings.notifications.email);
  }, [settings.company, settings.notifications.email]);

  const packetLabels = useMemo(
    () => settings.packetSizes.map((packet) => packet.label),
    [settings.packetSizes]
  );

  const updateSettings = (updater) => {
    setSettings((current) => {
      const nextSettings = typeof updater === "function" ? updater(current) : updater;
      return saveSystemSettings(nextSettings);
    });
  };

  const saveCompany = () => {
    updateSettings((current) => ({
      ...current,
      company: companyDraft,
    }));
  };

  const updatePacketSizes = (labels) => {
    updateSettings((current) => ({
      ...current,
      packetSizes: labels.map(makePacketSize),
    }));
  };

  const updateUnits = (units) => {
    updateSettings((current) => ({ ...current, units }));
  };

  const updateCategories = (productCategories) => {
    updateSettings((current) => ({ ...current, productCategories }));
  };

  const toggleRolePermission = (roleKey, permission, checked) => {
    updateSettings((current) => {
      const currentPermissions = current.roles[roleKey] || [];
      const nextPermissions = checked
        ? normalizeList([...currentPermissions, permission])
        : currentPermissions.filter((item) => item !== permission);

      return {
        ...current,
        roles: {
          ...current.roles,
          [roleKey]: nextPermissions,
        },
      };
    });
  };

  const toggleNotification = (key, value) => {
    updateSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));
  };

  const saveNotificationEmail = () => {
    updateSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        email: notificationEmail,
      },
    }));
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f6f8fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <header>
          <h1 className="text-[30px] font-bold leading-none text-[#111827]">Settings</h1>
          <p className="mt-4 text-[20px] leading-6 text-[#61718d]">Configure system preferences and settings</p>
        </header>

        <nav className="mt-8 rounded-[15px] bg-[#e7e7eb] p-1" aria-label="Settings sections">
          <div className="grid gap-1 md:grid-cols-4">
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = key === activeTab;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={[
                    "inline-flex h-[40px] items-center justify-center gap-4 rounded-[14px] px-4 text-[17px] font-bold text-[#111111] transition",
                    active ? "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "hover:bg-white/55",
                  ].join(" ")}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "general" ? (
          <SettingsCard title="Company Information" className="mt-10">
            <div className="mt-9 grid gap-x-5 gap-y-4 lg:grid-cols-2">
              <Field
                label="Company Name"
                value={companyDraft.name}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, name: event.target.value }))}
              />
              <Field
                label="Contact Number"
                value={companyDraft.contactNumber}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, contactNumber: event.target.value }))}
              />
              <Field
                label="Address"
                value={companyDraft.address}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, address: event.target.value }))}
                className="lg:col-span-2"
              />
              <Field
                label="Email"
                value={companyDraft.email}
                onChange={(event) => setCompanyDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <Field label="Currency">
                <select
                  value={companyDraft.currency}
                  onChange={(event) => setCompanyDraft((current) => ({ ...current, currency: event.target.value }))}
                  className="h-[45px] w-full appearance-none rounded-[9px] border-0 bg-[#f0f0f3] px-4 text-[17px] font-bold text-[#171717] outline-none focus:ring-2 focus:ring-[#523cf0]/25"
                >
                  <option value="BDT (\u09F3)">BDT ({"\u09F3"})</option>
                  <option value="USD ($)">USD ($)</option>
                  <option value="EUR (EUR)">EUR (EUR)</option>
                </select>
              </Field>
            </div>

            <button
              type="button"
              onClick={saveCompany}
              className="mt-5 h-[45px] rounded-[8px] bg-[#523cf0] px-5 text-[16px] font-bold text-white transition hover:bg-[#4632df]"
            >
              Save Changes
            </button>
          </SettingsCard>
        ) : null}

        {activeTab === "products" ? (
          <div className="mt-10 space-y-5">
            <SettingsCard title="Measurement Units">
              <ListEditor
                title="Available Units"
                items={settings.units}
                addLabel="Add Unit"
                placeholder="e.g., box"
                chipClassName="bg-[#dfe4ff] text-[#4038ff]"
                onChange={updateUnits}
              />
            </SettingsCard>

            <SettingsCard title="Packet Sizes">
              <ListEditor
                title="Standard Packet Sizes"
                items={packetLabels}
                addLabel="Add Packet Size"
                placeholder="e.g., 2kg"
                chipClassName="bg-[#d8f8df] text-[#008b43]"
                onChange={updatePacketSizes}
              />
            </SettingsCard>

            <SettingsCard title="Product Categories">
              <ListEditor
                title="Categories"
                items={settings.productCategories}
                addLabel="Add Category"
                placeholder="e.g., Muffin Mix"
                chipClassName="bg-[#f0ddff] text-[#7a00ff]"
                onChange={updateCategories}
              />
            </SettingsCard>
          </div>
        ) : null}

        {activeTab === "roles" ? (
          <SettingsCard title="User Roles & Permissions" className="mt-10">
            <div className="mt-8 rounded-[10px] border border-[#ccd4e8] bg-[#edf2ff] px-5 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-[24px] font-bold text-[#111111]">Admin</h3>
                  <p className="mt-2 text-[18px] text-[#5b6b88]">Full system access - All permissions enabled</p>
                </div>
                <span className="rounded-[9px] bg-[#523cf0] px-4 py-2 text-[14px] font-bold text-white">Full Access</span>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {roleSections.map((role) => {
                const selectedPermissions = settings.roles[role.key] || [];

                return (
                  <div key={role.key} className="rounded-[10px] border border-[#dedede] bg-white px-5 py-6">
                    <h3 className="text-[24px] font-bold text-[#111111]">{role.title}</h3>
                    <p className="mt-2 text-[18px] text-[#5b6b88]">{role.description}</p>
                    <div className="mt-5 grid gap-x-12 gap-y-2 md:grid-cols-2">
                      {permissionOptions.map((permission) => (
                        <PermissionCheckbox
                          key={`${role.key}-${permission}`}
                          label={permission}
                          checked={selectedPermissions.includes(permission)}
                          onChange={(checked) => toggleRolePermission(role.key, permission, checked)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsCard>
        ) : null}

        {activeTab === "notifications" ? (
          <div className="mt-10 space-y-5">
            <SettingsCard title="Notification Preferences">
              <div className="mt-8 space-y-4">
                {[
                  ["lowStockAlerts", "Low Stock Alerts", "Get notified when stock is low"],
                  ["productionCompletion", "Production Completion", "Notify when batch is completed"],
                  ["newSales", "New Sales", "Alert on new sale transactions"],
                  ["paymentDueReminders", "Payment Due Reminders", "Remind about pending payments"],
                ].map(([key, title, description]) => (
                  <div key={key} className="flex items-center justify-between gap-5 rounded-[10px] border border-[#dedede] px-4 py-5">
                    <div>
                      <h3 className="text-[20px] font-bold text-[#171717]">{title}</h3>
                      <p className="mt-1 text-[18px] text-[#61718d]">{description}</p>
                    </div>
                    <Toggle checked={Boolean(settings.notifications[key])} onChange={(value) => toggleNotification(key, value)} />
                  </div>
                ))}
              </div>
            </SettingsCard>

            <SettingsCard title="Email Notifications">
              <Field
                label="Notification Email"
                value={notificationEmail}
                onChange={(event) => setNotificationEmail(event.target.value)}
                className="mt-9"
              />
              <button
                type="button"
                onClick={saveNotificationEmail}
                className="mt-5 h-[45px] rounded-[8px] bg-[#523cf0] px-5 text-[16px] font-bold text-white transition hover:bg-[#4632df]"
              >
                Save Notification Settings
              </button>
            </SettingsCard>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="fixed bottom-5 right-5 grid h-10 w-10 place-items-center rounded-full border border-[#e5e7eb] bg-white text-[24px] text-[#111827] shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
        aria-label="Settings help"
      >
        ?
      </button>
    </section>
  );
}
