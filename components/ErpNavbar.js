"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessRoute } from "../utils/auth";

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#98a2b3]"
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

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 text-[#667085]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] text-[#344054]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.75v2.5" />
      <path d="M12 18.75v2.5" />
      <path d="m4.93 4.93 1.77 1.77" />
      <path d="m17.3 17.3 1.77 1.77" />
      <path d="M2.75 12h2.5" />
      <path d="M18.75 12h2.5" />
      <path d="m4.93 19.07 1.77-1.77" />
      <path d="m17.3 6.7 1.77-1.77" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#111827]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export default function ErpNavbar({ onMenuClick, activeTheme, onThemeChange, themeOptions, authUser, settings, onLogout }) {
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState("");
  const moduleSearchRoutes = [
    { href: "/suppliers", terms: ["supplier", "suppliers", "vendor"] },
    { href: "/supplier-payment", terms: ["supplier payment", "supplier pay", "vendor payment"] },
    { href: "/purchase", terms: ["purchase", "raw material purchase", "bought mix", "supplier order"] },
    { href: "/materials-name", terms: ["materials", "raw materials", "raw material stock", "bought mix stock"] },
    { href: "/factory-issue", terms: ["factory issue", "issue", "send to factory", "materials required"] },
    { href: "/mix-production", terms: ["mix production", "mix inventory", "bulk stock", "batch"] },
    { href: "/bulk-mix-stock", terms: ["bulk mix stock", "unpackaged production", "bulk inventory"] },
    { href: "/packaging", terms: ["packaging", "packet", "pack", "consumer ready", "bulk mix"] },
    { href: "/repack-product", terms: ["repack product", "repack", "purchased bulk", "branded packets"] },
    { href: "/finished-stock", terms: ["finished stock", "ready sale", "own production", "outside products"] },
    { href: "/expenses", terms: ["expense", "payment", "reference"] },
    { href: "/miscellaneous", terms: ["miscellaneous", "misc", "tea", "repair", "emergency"] },
    { href: "/sales", terms: ["sales", "sale", "invoice", "customer sale"] },
    { href: "/cart", terms: ["cart", "barcode", "scanner", "pos", "scan", "barcode cart"] },
    { href: "/customers", terms: ["customer", "customers", "phone", "contact"] },
    { href: "/accounts", terms: ["account", "ledger", "debit", "credit", "balance"] },
    { href: "/reports", terms: ["report", "analytics", "summary"] },
    { href: "/settings", terms: ["settings", "setting", "unit", "packet size", "roles", "notification"] },
  ];

  const handleGlobalSearch = (event) => {
    if (event.key !== "Enter") return;
    const query = globalSearch.trim().toLowerCase();
    if (!query) return;
    const accessibleRoutes = moduleSearchRoutes.filter((route) => canAccessRoute(authUser, route.href, settings));
    const matchedRoute = accessibleRoutes.find((route) =>
      (route.terms || []).some((term) => query.includes(term))
    );
    const fallbackRoute = canAccessRoute(authUser, "/reports", settings)
      ? "/reports?search=" + encodeURIComponent(query)
      : accessibleRoutes[0]?.href || "/";
    router.push(matchedRoute ? matchedRoute.href : fallbackRoute);
  };
  const activeThemeLabel =
    themeOptions.find((theme) => theme.value === activeTheme)?.label || "Theme";

  const handleThemeToggle = () => {
    const currentIndex = themeOptions.findIndex((theme) => theme.value === activeTheme);
    const nextTheme = themeOptions[(currentIndex + 1) % themeOptions.length];
    onThemeChange(nextTheme.value);
  };

  return (
    <header
      className="sticky top-0 z-30 border-b bg-[var(--navbar-bg)] lg:ml-[320px]"
      style={{ borderColor: "var(--navbar-border)" }}
    >
      <div className="flex h-[78px] items-stretch">
        <div
          className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-5 lg:px-6"
          style={{ borderColor: "var(--navbar-border)" }}
        >
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={onMenuClick}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-[var(--panel)] transition hover:bg-[var(--theme-hover)] lg:hidden"
            style={{ borderColor: "var(--navbar-border)" }}
          >
            <MenuIcon />
          </button>

          <div className="min-w-0 flex-1">
            <div className="relative mx-auto w-full max-w-[340px] sm:mx-0 sm:max-w-[420px] lg:max-w-[420px] xl:max-w-[420px]">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={handleGlobalSearch}
                placeholder="Global search: type supplier, purchase, stock, invoice, report etc. then press Enter..."
                className="h-10 w-full rounded-[9px] border bg-[var(--panel)] pl-10 pr-4 text-[14px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--theme-muted)] focus:border-[var(--theme-accent-soft)]"
                style={{ borderColor: "var(--search-border)" }}
              />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label={`Change theme. Current theme ${activeThemeLabel}`}
              className="inline-flex h-9 items-center gap-2 rounded-full border bg-[var(--panel)] px-3 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--theme-hover)]"
              style={{ borderColor: "var(--navbar-border)" }}
            >
              <span className="text-[var(--theme-accent)]">
                <ThemeIcon />
              </span>
              <span className="hidden sm:inline">{activeThemeLabel}</span>
            </button>

            <button
              type="button"
              aria-label="Notifications"
              className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-[var(--theme-hover)]"
            >
              <BellIcon />
              <span className="absolute right-[9px] top-[8px] h-[6px] w-[6px] rounded-full bg-[#ff4d4f]" />
            </button>

            <span className="grid h-[46px] w-[46px] place-items-center rounded-full bg-[#dfe6ff] text-[#523cf0]">
              <UserIcon />
            </span>

            <div className="hidden min-w-[88px] sm:block">
              <span className="block text-[17px] font-bold leading-none text-[var(--foreground)]">
                {authUser?.name || authUser?.username || "User"}
              </span>
              <span className="mt-2 block text-[13px] leading-none text-[var(--theme-muted)]">
                {authUser?.roleLabel || authUser?.role || "User"}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="grid h-10 w-10 place-items-center rounded-[10px] text-[#344054] transition hover:bg-[var(--theme-hover)]"
              aria-label="Sign out"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
