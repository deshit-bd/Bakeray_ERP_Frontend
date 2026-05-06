"use client";

import { useEffect } from "react";

const searchableRoutes = [
  "/supplier-payment",
  "/purchase",
  "/materials",
  "/materials-name",
  "/factory-issue",
  "/mix-production",
  "/packaging",
  "/repack-product",
  "/sales",
];

function makeSearchInput(placeholder) {
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = placeholder;
  input.className = "erp-auto-search-input mb-4 h-12 w-full max-w-[520px] rounded-[12px] border border-[var(--erp-border)] bg-[var(--erp-input-bg)] px-4 text-[16px] font-medium text-[var(--erp-text)] outline-none transition placeholder:text-[var(--erp-muted)] focus:border-[#523cf0] focus:ring-2 focus:ring-[#523cf0]/20";
  return input;
}

function getHeaderHint(table) {
  const headers = Array.from(table.querySelectorAll("thead th"))
    .map((th) => th.textContent.trim())
    .filter(Boolean)
    .slice(0, 4);
  return headers.length ? `Search by ${headers.join(", ")}` : "Search table records";
}


function getDateCellIndex(table) {
  const headers = Array.from(table.querySelectorAll("thead th"));
  return headers.findIndex((th) => /date/i.test(th.textContent || ""));
}

function parseRowDate(text) {
  const m = String(text || "").match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}

function enhanceDateFilters() {
  const tables = Array.from(document.querySelectorAll("table"));
  for (const table of tables) {
    if (table.dataset.erpDateFilterReady === "1") continue;
    const tbody = table.querySelector("tbody");
    const dateIndex = getDateCellIndex(table);
    if (!tbody || dateIndex < 0) {
      table.dataset.erpDateFilterReady = "1";
      continue;
    }
    const wrapper = table.closest(".overflow-x-auto") || table.parentElement;
    if (!wrapper || wrapper.querySelector(":scope > .erp-auto-date-filter")) {
      table.dataset.erpDateFilterReady = "1";
      continue;
    }
    const box = document.createElement("div");
    box.className = "erp-auto-date-filter mb-4 flex flex-wrap items-end gap-3";
    const startWrap = document.createElement("label");
    startWrap.className = "grid gap-1 text-sm font-bold text-[var(--erp-muted)]";
    startWrap.textContent = "Start date";
    const start = document.createElement("input");
    start.type = "date";
    start.className = "h-11 rounded-[10px] border border-[var(--erp-border)] bg-[var(--erp-input-bg)] px-3 text-[var(--erp-text)] outline-none focus:border-[#523cf0] focus:ring-2 focus:ring-[#523cf0]/20";
    const endWrap = document.createElement("label");
    endWrap.className = "grid gap-1 text-sm font-bold text-[var(--erp-muted)]";
    endWrap.textContent = "End date";
    const end = document.createElement("input");
    end.type = "date";
    end.className = start.className;
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "Clear date filter";
    clear.className = "h-11 rounded-[10px] border border-[var(--erp-border)] bg-[var(--erp-card)] px-4 text-sm font-bold text-[var(--erp-text)] hover:border-[#523cf0]";
    startWrap.appendChild(start);
    endWrap.appendChild(end);
    box.append(startWrap, endWrap, clear);
    wrapper.insertBefore(box, wrapper.firstChild);

    const apply = () => {
      const startValue = start.value;
      const endValue = end.value;
      Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
        const cells = Array.from(row.children);
        const dateValue = parseRowDate(cells[dateIndex]?.textContent || row.textContent);
        const okStart = !startValue || (dateValue && dateValue >= startValue);
        const okEnd = !endValue || (dateValue && dateValue <= endValue);
        const ok = (!startValue && !endValue) || (okStart && okEnd);
        row.dataset.erpDateVisible = ok ? "1" : "0";
        row.style.display = ok ? "" : "none";
      });
    };
    start.addEventListener("change", apply);
    end.addEventListener("change", apply);
    clear.addEventListener("click", () => { start.value = ""; end.value = ""; apply(); });
    table.dataset.erpDateFilterReady = "1";
  }
}

function enhanceTables() {
  const tables = Array.from(document.querySelectorAll("table"));
  for (const table of tables) {
    if (table.dataset.erpSearchReady === "1") continue;
    const tbody = table.querySelector("tbody");
    if (!tbody) continue;
    const wrapper = table.closest(".overflow-x-auto") || table.parentElement;
    if (!wrapper || wrapper.querySelector(":scope > .erp-auto-table-search")) {
      table.dataset.erpSearchReady = "1";
      continue;
    }
    const box = document.createElement("div");
    box.className = "erp-auto-table-search mt-5 flex flex-wrap items-center justify-between gap-3";
    const input = makeSearchInput(getHeaderHint(table));
    const hint = document.createElement("span");
    hint.className = "text-sm font-medium text-[var(--erp-muted)]";
    hint.textContent = "Search scans all visible columns";
    box.append(input, hint);
    wrapper.insertBefore(box, table);

    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = !query || text.includes(query) ? "" : "none";
      });
    });
    table.dataset.erpSearchReady = "1";
  }
}

function enhanceSelect(select) {
  if (select.dataset.erpSelectSearchReady === "1") return;
  select.dataset.erpSelectSearchReady = "1";

  const helper = makeSearchInput("Search dropdown options...");
  helper.className = helper.className.replace("mb-4", "mb-2");
  helper.style.display = "none";
  helper.dataset.erpSelectHelper = "1";

  const parent = select.parentElement;
  if (!parent) return;
  parent.insertBefore(helper, select);

  const filterOptions = () => {
    const q = helper.value.trim().toLowerCase();
    const options = Array.from(select.options || []);
    let firstMatch = null;
    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      const ok = !q || text.includes(q);
      option.hidden = !ok;
      option.disabled = option.value === "" ? option.disabled : !ok;
      if (ok && option.value && !firstMatch) firstMatch = option;
    });
  };

  select.addEventListener("focus", () => {
    helper.style.display = "block";
  });
  select.addEventListener("mousedown", () => {
    helper.style.display = "block";
  });
  helper.addEventListener("input", filterOptions);
  helper.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const q = helper.value.trim().toLowerCase();
    const match = Array.from(select.options || []).find((option) => option.value && option.textContent.toLowerCase().includes(q));
    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

function enhanceDropdowns() {
  if (!searchableRoutes.some((route) => window.location.pathname.startsWith(route))) return;
  Array.from(document.querySelectorAll("select")).forEach(enhanceSelect);
}

export default function ErpUiEnhancer() {
  useEffect(() => {
    const run = () => {
      enhanceDateFilters();
      enhanceTables();
      enhanceDropdowns();
    };
    run();
    const observer = new MutationObserver(() => run());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("focus", run);
    return () => {
      observer.disconnect();
      window.removeEventListener("focus", run);
    };
  }, []);
  return null;
}
