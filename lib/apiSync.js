export const DB_SYNC_EVENT = "erp-db-sync-status";
export const DATA_RESET_TOKEN_KEY = "erp-data-reset-token-v1";
export const AUTH_SESSION_STORAGE_KEY = "erp-auth-session-v1";
export const API_BASE_URL = "";
export const ERP_DATA_KEYS = [];
function emitStatus(detail) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(DB_SYNC_EVENT, { detail })); }
export async function hydrateFromDb() { emitStatus({ state: "ready" }); }
export async function refreshDbLocalStorageBridge() { emitStatus({ state: "ready" }); }
export function installDbLocalStorageBridge() { if (typeof window !== "undefined") emitStatus({ state: "ready" }); }
export async function flushDbKey() { return true; }
export async function flushAllDbData() { return true; }
