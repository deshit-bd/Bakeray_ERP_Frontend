"use client";
import { useEffect, useState } from "react";
import { hydrateFromDb, installDbLocalStorageBridge } from "../lib/apiSync";
export default function ApiSyncProvider({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let mounted = true; Promise.resolve().then(hydrateFromDb).then(installDbLocalStorageBridge).finally(() => { if (mounted) setReady(true); }); return () => { mounted = false; }; }, []);
  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]"><div className="rounded-2xl border bg-white p-8 shadow-sm"><h1 className="text-xl font-bold">Loading local data...</h1><p className="mt-2 text-sm text-slate-600">Frontend-only localStorage version.</p></div></div>;
  return children;
}
