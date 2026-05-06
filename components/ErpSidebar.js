"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";
import { canAccessRoute } from "../utils/auth";

function SidebarIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[24px] w-[24px]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function BrandIcon() {
  return (
    <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-[#523cf0] text-white shadow-[0_10px_22px_rgba(82,60,240,0.24)]">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 3h6" />
        <path d="M10 3v5.2l-4.6 8A3.1 3.1 0 0 0 8.1 21h7.8a3.1 3.1 0 0 0 2.7-4.8l-4.6-8V3" />
        <path d="M8 15h8" />
      </svg>
    </span>
  );
}

function DashboardIcon() {
  return (
    <SidebarIcon>
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v4h-6z" />
      <path d="M14 12h6v8h-6z" />
      <path d="M4 14h6v6H4z" />
    </SidebarIcon>
  );
}

function RawMaterialsIcon() {
  return (
    <SidebarIcon>
      <path d="M6 4h12l-1.2 16H7.2L6 4Z" />
      <path d="M8 8h8" />
      <path d="M9 12h6" />
      <path d="M10 16h4" />
    </SidebarIcon>
  );
}

function PurchaseIcon() {
  return (
    <SidebarIcon>
      <path d="M4 5h2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h7.8a1.5 1.5 0 0 0 1.4-1l1.7-6.4H7.3" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
      <path d="M13 5h4" />
      <path d="M15 3v4" />
    </SidebarIcon>
  );
}

function PaymentIcon() {
  return (
    <SidebarIcon>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <path d="M3.5 9.5h17" />
      <path d="M7 14.5h5" />
    </SidebarIcon>
  );
}

function FactoryIssueIcon() {
  return (
    <SidebarIcon>
      <path d="M4 19V9l5 3V9l5 3V7l6 4v8H4Z" />
      <path d="M7 19v-3h3v3" />
      <path d="M14 19v-3h3v3" />
    </SidebarIcon>
  );
}

function MixProductionIcon() {
  return (
    <SidebarIcon>
      <path d="M7 4h10" />
      <path d="M9 4v5l-4 7a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 16l-4-7V4" />
      <path d="M8 15h8" />
      <path d="M10 18h4" />
    </SidebarIcon>
  );
}

function BulkMixStockIcon() {
  return (
    <SidebarIcon>
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </SidebarIcon>
  );
}

function PackagingIcon() {
  return (
    <SidebarIcon>
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="M5 7l7 4 7-4" />
      <path d="M12 21V11" />
      <path d="M8.5 5l7 4" />
    </SidebarIcon>
  );
}

function RepackIcon() {
  return (
    <SidebarIcon>
      <path d="M7 7h9a3 3 0 0 1 0 6H9" />
      <path d="m10 4-3 3 3 3" />
      <path d="M17 17H8a3 3 0 0 1 0-6h7" />
      <path d="m14 20 3-3-3-3" />
    </SidebarIcon>
  );
}

function FinishedStockIcon() {
  return (
    <SidebarIcon>
      <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" />
      <path d="M4 8.5v7L12 20l8-4.5v-7" />
      <path d="M12 13v7" />
      <path d="M8 15.2l2 1.1" />
    </SidebarIcon>
  );
}

function SalesIcon() {
  return (
    <SidebarIcon>
      <path d="M12 3v18" />
      <path d="M17 7.5A4 4 0 0 0 12.8 6H11a3 3 0 0 0 0 6h2a3 3 0 1 1 0 6h-2.2A4.2 4.2 0 0 1 7 16.5" />
    </SidebarIcon>
  );
}

function CustomersIcon() {
  return (
    <SidebarIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M17 3.13a4 4 0 0 1 0 7.75" />
    </SidebarIcon>
  );
}

function ExpensesIcon() {
  return (
    <SidebarIcon>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </SidebarIcon>
  );
}

function MiscellaneousIcon() {
  return (
    <SidebarIcon>
      <path d="M12 4 8.5 10h7L12 4Z" />
      <rect x="5" y="14" width="5" height="5" rx="1" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </SidebarIcon>
  );
}

function AccountsIcon() {
  return (
    <SidebarIcon>
      <path d="M4 7h16" />
      <path d="M6 7v12h12V7" />
      <path d="M8 11h8" />
      <path d="M8 15h3" />
      <path d="M14 15h2" />
    </SidebarIcon>
  );
}

function ReportsIcon() {
  return (
    <SidebarIcon>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4" />
      <path d="M10 13h1.5v4H10z" />
      <path d="M13 11h1.5v6H13z" />
      <path d="M16 9h1.5v8H16z" />
    </SidebarIcon>
  );
}

function SettingsIcon() {
  return (
    <SidebarIcon>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.04A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 8.97 3.6 1.7 1.7 0 0 0 10 2.04V2a2 2 0 1 1 4 0v.04a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.04A1.7 1.7 0 0 0 19.4 15Z" />
    </SidebarIcon>
  );
}

const items = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Suppliers", href: "/suppliers", icon: CustomersIcon },
  { label: "Supplier Payment", href: "/supplier-payment", icon: PaymentIcon },
  { label: "Purchase", href: "/purchase", icon: PurchaseIcon },
  { label: "Materials", href: "/materials-name", icon: RawMaterialsIcon, keywords: "materials raw materials bought mix stock" },
  { label: "Factory Issue", href: "/factory-issue", icon: FactoryIssueIcon },
  { label: "Mix Production", href: "/mix-production", icon: MixProductionIcon },
  { label: "Bulk Mix Stock", href: "/bulk-mix-stock", icon: BulkMixStockIcon },
  { label: "Packaging", href: "/packaging", icon: PackagingIcon },
  { label: "Repack Product", href: "/repack-product", icon: RepackIcon, keywords: "repack product purchased bulk mix branded packets" },
  { label: "Finished Stock", href: "/finished-stock", icon: FinishedStockIcon, keywords: "finished stock ready sale own production repack outside products" },
  { label: "Expenses", href: "/expenses", icon: ExpensesIcon },
  { label: "Miscellaneous", href: "/miscellaneous", icon: MiscellaneousIcon },
  { label: "Sales", href: "/sales", icon: SalesIcon },
  { label: "Cart", href: "/cart", icon: SalesIcon, keywords: "barcode scanner cart invoice pos" },
  { label: "Customers", href: "/customers", icon: CustomersIcon },
  { label: "Accounts", href: "/accounts", icon: AccountsIcon },
  { label: "Reports", href: "/reports", icon: ReportsIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export default function ErpSidebar({ sidebarOpen, onClose, authUser, settings: shellSettings }) {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState(() => readSystemSettings());

  useEffect(() => subscribeSystemSettings(setSettings), []);

  return (
    <>
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-20 bg-[var(--sidebar-overlay)] backdrop-blur-[1px] transition lg:hidden",
          sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        className={[
          "fixed bottom-0 left-0 top-0 z-40 w-[320px] border-r bg-[var(--sidebar-bg)] transition duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <nav className="flex h-full flex-col">
          <div className="flex h-[88px] shrink-0 items-center justify-between border-b px-[30px]" style={{ borderColor: "var(--sidebar-border)" }}>
            <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
              <BrandIcon />
              <span className="truncate text-[22px] font-extrabold leading-none text-[#0f172a]">
                {settings.company.name || "Bakery ERP"}
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-[var(--foreground)] hover:bg-[var(--theme-hover)] lg:hidden"
              aria-label="Close sidebar"
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

          <ul className="sidebar-route-scroll min-h-0 flex-1 space-y-[10px] overflow-y-auto overflow-x-hidden px-[30px] py-7">
            {items.filter((item) => canAccessRoute(authUser, item.href, shellSettings || settings)).map(({ label, href, icon: Icon = ReportsIcon }) => {
              const active = pathname === href;

              return (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className={[
                      "flex min-h-[46px] w-full items-center gap-[18px] rounded-[9px] px-1 text-left text-[17px] font-medium transition",
                      active
                        ? "bg-[#2eac9a] text-white shadow-[0_8px_24px_rgba(46,172,154,0.15)]"
                        : "text-[#273a59] hover:bg-[#ecf8f7] hover:text-[var(--theme-accent)]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        active ? "text-white" : "text-[#51617c]",
                        "grid h-7 w-7 shrink-0 place-items-center",
                      ].join(" ")}
                    >
                      <Icon />
                    </span>
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="shrink-0 border-t border-[var(--sidebar-border)] px-3 py-5 text-center">
            <p className="text-[14px] font-medium text-[#61718d]">{"\u00A9"} {currentYear} Bakery ERP</p>
          </div>
        </nav>
      </aside>
    </>
  );
}
