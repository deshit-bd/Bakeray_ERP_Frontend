import Link from "next/link";
import ReportsDataClient from "./ReportsDataClient";

const BDT_SYMBOL = "\u09F3";

export const reportTabs = [
  { key: "raw-materials", label: "Raw Materials", icon: RawMaterialsIcon },
  { key: "production", label: "Production", icon: ProductionIcon },
  { key: "packaging", label: "Packaging", icon: PackagingIcon },
  { key: "sales", label: "Sales", icon: SalesIcon },
  { key: "profit-loss", label: "Profit/Loss", icon: ProfitLossIcon },
];

export function isValidReportKey(reportKey) {
  return reportTabs.some((tab) => tab.key === reportKey);
}

function ReportIconBase({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function RawMaterialsIcon() {
  return (
    <ReportIconBase>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="m8 5.3 8 4.5" />
    </ReportIconBase>
  );
}

function ProductionIcon() {
  return (
    <ReportIconBase>
      <path d="M4 20V10l5 3V9l5 4V7l6 4v9H4Z" />
      <path d="M8 20v-4" />
      <path d="M13 20v-4" />
      <path d="M18 20v-4" />
    </ReportIconBase>
  );
}

function PackagingIcon() {
  return (
    <ReportIconBase>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M8 10v4" />
      <path d="M16 10v4" />
    </ReportIconBase>
  );
}

function SalesIcon() {
  return <span className="text-[24px] font-medium leading-none">{BDT_SYMBOL}</span>;
}

function ProfitLossIcon() {
  return (
    <ReportIconBase>
      <path d="M4 16 9 11l4 4 7-8" />
      <path d="M15 7h5v5" />
    </ReportIconBase>
  );
}

function getTabHref(key) {
  return key === "profit-loss" ? "/reports" : `/reports/${key}`;
}

export default function ReportsPageShell({ activeReportKey }) {
  return (
    <section className="min-w-0 flex-1 bg-[#f6f8fc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <header>
          <h1 className="text-[30px] font-bold leading-none tracking-[-0.02em] text-[#111827] sm:text-[32px]">
            Reports
          </h1>
          <p className="mt-3 text-[20px] leading-6 text-[#61718d]">
            Comprehensive business analytics and reports
          </p>
        </header>

        <nav className="mt-8 overflow-x-auto pb-1" aria-label="Report sections">
          <div className="flex min-w-[820px] rounded-[15px] bg-[#e7e7eb] p-1">
            {reportTabs.map(({ key, label, icon: Icon }) => {
              const active = key === activeReportKey;

              return (
                <Link
                  key={key}
                  href={getTabHref(key)}
                  className={[
                    "inline-flex h-[36px] flex-1 items-center justify-center gap-4 rounded-[14px] px-4 text-[17px] font-bold leading-none text-[#111111] transition",
                    active ? "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "hover:bg-white/55",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                  prefetch
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <ReportsDataClient activeReportKey={activeReportKey} />
      </div>
    </section>
  );
}
