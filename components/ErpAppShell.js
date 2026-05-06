"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ErpNavbar from "./ErpNavbar";
import ErpSidebar from "./ErpSidebar";
import LoginPage from "./LoginPage";
import {
  canAccessRoute,
  clearAuthSession,
  getFirstAllowedRoute,
  readAuthSession,
} from "../utils/auth";
import {
  readSystemSettings,
  subscribeSystemSettings,
} from "../utils/systemSettings";

const THEME_STORAGE_KEY = "erp-theme";

const themeOptions = [
  { value: "default", label: "Ocean" },
  { value: "dark", label: "Dark" },
];

export default function ErpAppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState("default");
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState(() => readSystemSettings());

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const fallbackTheme = themeOptions[0].value;
    const nextTheme = themeOptions.some((theme) => theme.value === savedTheme)
      ? savedTheme
      : fallbackTheme;

    setActiveTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    setAuthUser(readAuthSession());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    return subscribeSystemSettings(setSettings);
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) return;
    if (canAccessRoute(authUser, pathname, settings)) return;
    router.replace(getFirstAllowedRoute(authUser, settings));
  }, [authReady, authUser, pathname, router, settings]);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
  }, [activeTheme]);

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
    setSidebarOpen(false);
  };

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8fafc] text-[#667085]">
        Loading...
      </main>
    );
  }

  if (!authUser) {
    return <LoginPage onLogin={setAuthUser} />;
  }

  const allowed = canAccessRoute(authUser, pathname, settings);

  return (
    <main className="min-h-screen bg-[var(--background)] transition-colors">
      <ErpNavbar
        onMenuClick={() => setSidebarOpen((open) => !open)}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
        themeOptions={themeOptions}
        authUser={authUser}
        settings={settings}
        onLogout={handleLogout}
      />

      <div className="relative flex">
        <ErpSidebar
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          authUser={authUser}
          settings={settings}
        />

        <div className="flex min-w-0 flex-1 lg:ml-[320px]">
          {allowed ? children : (
            <section className="flex min-h-[calc(100vh-78px)] flex-1 items-center justify-center bg-[#f6f8fc] px-6 text-center">
              <div className="rounded-[14px] border border-[#dbe3ef] bg-white px-8 py-7 shadow-sm">
                <h1 className="text-[22px] font-bold text-[#111827]">Access restricted</h1>
                <p className="mt-2 text-[15px] text-[#667085]">Your role does not have permission for this route.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
