"use client";

import { useMemo, useRef, useState } from "react";
import { buildImportPreview, readTableFile } from "../utils/tableImport";

const monthOptions = [
  { value: "2026-04", label: "This Month", exportLabel: "April 2026" },
  { value: "2026-03", label: "March 2026", exportLabel: "March 2026" },
  { value: "2026-02", label: "February 2026", exportLabel: "February 2026" },
  { value: "all", label: "All Months", exportLabel: "All Months" },
];

const profitSummaryClassNames = {
  revenue: "text-[#00b050]",
  cost: "text-[#f00000]",
  profit: "text-[#5751f7]",
};

const reports = [
  {
    key: "rawMaterials",
    label: "Raw Materials",
    title: "Raw Material Usage Report",
    filename: "raw-material-usage-report",
    columns: [
      { key: "material", label: "Material", aliases: ["Raw Material", "Item"] },
      { key: "opening", label: "Opening", aliases: ["Opening Stock", "Initial"] },
      { key: "purchased", label: "Purchased", aliases: ["Purchase", "Bought"] },
      { key: "used", label: "Used", aliases: ["Usage", "Consumed"] },
      {
        key: "closing",
        label: "Closing",
        aliases: ["Closing Stock", "Balance"],
        className: "font-semibold text-[#111827]",
      },
    ],
    rows: [],
  },
  {
    key: "production",
    label: "Production",
    title: "Production Report",
    filename: "production-report",
    columns: [
      { key: "mixType", label: "Mix Type", aliases: ["Mix", "Type"] },
      { key: "batches", label: "Batches", aliases: ["Batch", "Batch Count"] },
      { key: "totalOutput", label: "Total Output", aliases: ["Output", "Production"] },
      { key: "loss", label: "Loss", aliases: ["Wastage"] },
      { key: "efficiency", label: "Efficiency", aliases: ["Yield"] },
    ],
    rows: [],
  },
  {
    key: "packaging",
    label: "Packaging",
    title: "Packaging Report",
    filename: "packaging-report",
    columns: [
      { key: "product", label: "Product", aliases: ["Product Name", "Item"] },
      { key: "packetSize", label: "Packet Size", aliases: ["Size", "Pack Size"] },
      { key: "packetsMade", label: "Packets Made", aliases: ["Packets", "Quantity"] },
      { key: "materialUsed", label: "Material Used", aliases: ["Material", "Used"] },
    ],
    rows: [],
  },
  {
    key: "sales",
    label: "Sales",
    title: "Sales Report",
    filename: "sales-report",
    columns: [
      { key: "product", label: "Product", aliases: ["Product Name", "Item"] },
      { key: "qtySold", label: "Qty Sold", aliases: ["Quantity Sold", "Sold", "Qty"] },
      { key: "revenue", label: "Revenue", aliases: ["Sales", "Total Revenue"] },
      { key: "avgPrice", label: "Avg Price", aliases: ["Average Price", "Price"] },
    ],
    rows: [],
  },
  {
    key: "profitLoss",
    label: "Profit/Loss",
    title: "Profit/Loss by Product",
    filename: "profit-loss-report",
    summaryCards: [
      { label: "Total Revenue", value: "৳6,82,000", valueClassName: profitSummaryClassNames.revenue },
      { label: "Total Cost", value: "৳5,18,000", valueClassName: profitSummaryClassNames.cost },
      { label: "Net Profit", value: "৳1,64,000", valueClassName: profitSummaryClassNames.profit },
    ],
    summaryCardsByMonth: {
      "2026-04": [
        { label: "Total Revenue", value: "৳2,45,000", valueClassName: profitSummaryClassNames.revenue },
        { label: "Total Cost", value: "৳1,85,000", valueClassName: profitSummaryClassNames.cost },
        { label: "Net Profit", value: "৳60,000", valueClassName: profitSummaryClassNames.profit },
      ],
      "2026-03": [
        { label: "Total Revenue", value: "৳2,25,000", valueClassName: profitSummaryClassNames.revenue },
        { label: "Total Cost", value: "৳1,72,000", valueClassName: profitSummaryClassNames.cost },
        { label: "Net Profit", value: "৳53,000", valueClassName: profitSummaryClassNames.profit },
      ],
      "2026-02": [
        { label: "Total Revenue", value: "৳2,12,000", valueClassName: profitSummaryClassNames.revenue },
        { label: "Total Cost", value: "৳1,61,000", valueClassName: profitSummaryClassNames.cost },
        { label: "Net Profit", value: "৳51,000", valueClassName: profitSummaryClassNames.profit },
      ],
    },
    columns: [
      { key: "product", label: "Product", aliases: ["Product Name", "Item"] },
      { key: "revenue", label: "Revenue", aliases: ["Sales", "Total Revenue"] },
      { key: "cost", label: "Cost", aliases: ["Total Cost"] },
      {
        key: "profit",
        label: "Profit",
        aliases: ["Net Profit"],
        className: "font-semibold text-[#00b050]",
      },
      { key: "margin", label: "Margin", aliases: ["Profit Margin"] },
    ],
    rows: [],
  },
];

const initialDialogState = {
  isOpen: false,
  isLoading: false,
  isExporting: false,
  fileName: "",
  errorMessage: "",
  preview: null,
};


function CurrencyText({ value }) {
  if (typeof value !== "string" || !value.startsWith("৳")) {
    return value;
  }

  return (
    <>
      <span className="currency-symbol">৳</span>
      {value.slice(1)}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v11" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function getRowsForMonth(rows, selectedMonth) {
  if (selectedMonth === "all") {
    return rows;
  }

  return rows.filter((row) => row.month === selectedMonth);
}

function getMonthMeta(selectedMonth) {
  return monthOptions.find((option) => option.value === selectedMonth) || monthOptions[0];
}

function getSummaryCards(report, selectedMonth) {
  if (!report.summaryCards) {
    return null;
  }

  if (selectedMonth === "all") {
    return report.summaryCards;
  }

  return report.summaryCardsByMonth?.[selectedMonth] || report.summaryCards;
}

function getDownloadBaseName(report, monthValue) {
  const monthPart = monthValue === "all" ? "all-months" : monthValue;
  return `${report.filename}-${monthPart}-merged`;
}

function getFileExtension(fileName) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  return extension || "csv";
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildSheetRows(report, monthLabel, rows, summaryCards) {
  const sheetRows = [[report.title], ["Month", monthLabel]];

  if (summaryCards?.length) {
    sheetRows.push([], ["Metric", "Value"]);
    summaryCards.forEach((card) => sheetRows.push([card.label, card.value]));
  }

  sheetRows.push([], report.columns.map((column) => column.label));
  rows.forEach((row) => {
    sheetRows.push(report.columns.map((column) => row[column.key]));
  });

  return sheetRows;
}

async function exportMergedReport({ report, monthValue, monthLabel, rows, summaryCards, sourceFileName }) {
  const extension = getFileExtension(sourceFileName);
  const sheetRows = buildSheetRows(report, monthLabel, rows, summaryCards);
  const baseName = getDownloadBaseName(report, monthValue);

  if (extension === "xlsx" || extension === "xls") {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    const finalOutput = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([finalOutput], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${baseName}.xlsx`
    );
    return;
  }

  const csv = sheetRows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  downloadBlob(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }), `${baseName}.csv`);
}

function ReportTable({ columns, rows }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-[720px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#2d2d2d] bg-[#fbfcfd]">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-[12px] font-medium uppercase text-[#667085]"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`${row.product || row.material || row.mixType}-${rowIndex}`}
              className="border-b border-[#e7ebf0] last:border-b-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    "px-4 py-3.5 text-[14px] leading-6 text-[#1f2937]",
                    column.className || "",
                  ].join(" ")}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 ? (
        <div className="border-b border-[#e7ebf0] px-4 py-8 text-center text-[14px] text-[#667085]">
          No rows found for this month.
        </div>
      ) : null}
    </div>
  );
}

function StandardReportCard({ report, rows }) {
  return (
    <article className="mt-6 rounded-[8px] border border-[#dde3ea] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.08)]">
      <h2 className="text-[18px] font-semibold text-[#111827]">{report.title}</h2>
      <ReportTable columns={report.columns} rows={rows} />
    </article>
  );
}

function ProfitLossReport({ report, rows, summaryCards }) {
  return (
    <div className="mt-6">
      <div className="grid gap-5 md:grid-cols-3">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="rounded-[8px] border border-[#dde3ea] bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.08)]"
          >
            <p className="text-[14px] text-[#536176]">{card.label}</p>
            <p className={`mt-2 text-[26px] font-bold leading-none ${card.valueClassName}`}>
              <CurrencyText value={card.value} />
            </p>
          </article>
        ))}
      </div>

      <article className="mt-6 rounded-[8px] border border-[#dde3ea] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.08)]">
        <h2 className="text-[18px] font-semibold text-[#111827]">{report.title}</h2>
        <ReportTable columns={report.columns} rows={rows} />
      </article>
    </div>
  );
}

function ReportExportDialog({
  report,
  monthLabel,
  dialog,
  onClose,
  onConfirm,
}) {
  const preview = dialog.preview;

  return (
    <div
      className={[
        "fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/40 p-4 transition",
        dialog.isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="flex max-h-[90vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eaecf0] px-5 py-4">
          <div>
            <h2 className="text-[22px] font-semibold text-[#181d27]">Export Preview</h2>
            <p className="mt-1 text-[13px] text-[#667085]">
              {report.label} report for {monthLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#f8fafc]"
            aria-label="Close export preview"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="rounded-[14px] border border-[#dfe5ef] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#344054]">
            <span className="font-semibold">Selected file:</span> {dialog.fileName || "No file selected"}
          </div>

          {dialog.isLoading ? (
            <div className="py-12 text-center text-[15px] text-[#667085]">
              Reading file and matching active report headers...
            </div>
          ) : null}

          {!dialog.isLoading && dialog.errorMessage ? (
            <div className="mt-4 rounded-[14px] border border-[#fecaca] bg-[#fff1f2] px-4 py-4 text-[14px] text-[#b42318]">
              {dialog.errorMessage}
            </div>
          ) : null}

          {!dialog.isLoading && preview ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">Original Rows</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#181d27]">
                    {preview.existingCount}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">File Rows Appended</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#2563eb]">
                    {preview.importedRows.length}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">New Report Rows</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#16a34a]">
                    {preview.totalAfterImport}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                <p className="text-[13px] font-semibold text-[#181d27]">Header Match Report</p>
                <p className="mt-1 text-[13px] text-[#667085]">
                  {preview.matchedHeaders.length} headers matched with the active report table.
                </p>
                {preview.unmatchedHeaders.length > 0 ? (
                  <p className="mt-2 text-[13px] text-[#b54708]">
                    Ignored file headers: {preview.unmatchedHeaders.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#dfe5ef]">
                <div className="border-b border-[#eaecf0] bg-[#f9fafb] px-4 py-3 text-[13px] font-semibold text-[#475467]">
                  Generated Report Table
                </div>
                <div className="max-h-[360px] overflow-auto">
                  <table className="min-w-[900px] w-full text-left text-[13px] text-[#344054]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#f9fafb]">
                        {report.columns.map((column) => (
                          <th
                            key={column.key}
                            className="border-b border-[#eaecf0] px-4 py-4 font-semibold text-[#475467]"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.mergedRows.map((row, rowIndex) => (
                        <tr
                          key={`${row?.product || row?.material || row?.mixType || "row"}-${rowIndex}`}
                          className={rowIndex >= preview.existingCount ? "bg-[#f8fbff]" : "bg-white"}
                        >
                          {report.columns.map((column) => (
                            <td
                              key={column.key}
                              className="border-b border-[#eaecf0] px-4 py-4 align-top"
                            >
                              {String(row?.[column.key] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eaecf0] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[#d0d5dd] bg-white px-6 text-[14px] font-medium text-[#181d27] transition hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!preview || dialog.isLoading || dialog.isExporting}
            className={[
              "inline-flex h-11 items-center justify-center rounded-[10px] px-6 text-[14px] font-medium text-white transition",
              preview && !dialog.isLoading && !dialog.isExporting
                ? "bg-[#22c55e] hover:bg-[#16a34a]"
                : "cursor-not-allowed bg-[#98a2b3]",
            ].join(" ")}
          >
            {dialog.isExporting ? "Exporting..." : "Confirm Export"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsAnalyticsManagement() {
  const fileInputRef = useRef(null);
  const [activeReportKey, setActiveReportKey] = useState("rawMaterials");
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [dialog, setDialog] = useState(initialDialogState);

  const activeReport = useMemo(
    () => reports.find((report) => report.key === activeReportKey) || reports[0],
    [activeReportKey]
  );

  const monthMeta = useMemo(() => getMonthMeta(selectedMonth), [selectedMonth]);

  const activeRows = useMemo(
    () => getRowsForMonth(activeReport.rows, selectedMonth),
    [activeReport, selectedMonth]
  );

  const activeSummaryCards = useMemo(
    () => getSummaryCards(activeReport, selectedMonth),
    [activeReport, selectedMonth]
  );

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const closeDialog = () => {
    setDialog(initialDialogState);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setDialog({
      ...initialDialogState,
      isOpen: true,
      isLoading: true,
      fileName: file.name,
    });

    try {
      const fileRows = await readTableFile(file);
      const preview = buildImportPreview({
        fileRows,
        columns: activeReport.columns,
        existingRows: activeRows,
        keyField: activeReport.columns[0]?.key || "id",
      });

      setDialog((current) => ({
        ...current,
        isLoading: false,
        preview,
      }));
    } catch (error) {
      setDialog((current) => ({
        ...current,
        isLoading: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Could not read this Excel or CSV file.",
      }));
    }
  };

  const confirmExport = async () => {
    if (!dialog.preview) {
      return;
    }

    setDialog((current) => ({ ...current, isExporting: true, errorMessage: "" }));

    try {
      await exportMergedReport({
        report: activeReport,
        monthValue: selectedMonth,
        monthLabel: monthMeta.exportLabel,
        rows: dialog.preview.mergedRows,
        summaryCards: activeSummaryCards,
        sourceFileName: dialog.fileName,
      });
      closeDialog();
    } catch (error) {
      setDialog((current) => ({
        ...current,
        isExporting: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Could not export the generated report.",
      }));
    }
  };

  return (
    <section className="min-w-0 flex-1 bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-[#111827]">
            Reports
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="report-month">
              Report month
            </label>
            <div className="relative">
              <select
                id="report-month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-[36px] min-w-[154px] appearance-none rounded-[7px] border border-transparent bg-[#f1f2f4] px-4 pr-10 text-[14px] text-[#111827] outline-none transition focus:border-[#bfdbfe] focus:ring-2 focus:ring-[#dbeafe]"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]">
                <ChevronDownIcon />
              </span>
            </div>

            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex h-[36px] items-center justify-center gap-2 rounded-[7px] bg-[#22c55e] px-4 text-[14px] font-medium text-white transition hover:bg-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#bbf7d0]"
            >
              <DownloadIcon />
              Export
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <div
            role="tablist"
            aria-label="Report sections"
            className="flex min-w-[680px] rounded-full bg-[#e8e8ec] p-1"
          >
            {reports.map((report) => {
              const active = activeReport.key === report.key;

              return (
                <button
                  key={report.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveReportKey(report.key)}
                  className={[
                    "h-[28px] flex-1 rounded-full px-4 text-center text-[14px] font-medium transition",
                    active
                      ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                      : "text-[#111827] hover:bg-white/55",
                  ].join(" ")}
                >
                  {report.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeReport.key === "profitLoss" ? (
          <ProfitLossReport
            report={activeReport}
            rows={activeRows}
            summaryCards={activeSummaryCards}
          />
        ) : (
          <StandardReportCard report={activeReport} rows={activeRows} />
        )}
      </div>

      <ReportExportDialog
        report={activeReport}
        monthLabel={monthMeta.exportLabel}
        dialog={dialog}
        onClose={closeDialog}
        onConfirm={confirmExport}
      />
    </section>
  );
}
