"use client";

import { useEffect, useState } from "react";
import {
  buildReportData,
  formatCurrency,
  formatPlainNumber,
  safeNumber,
} from "@/utils/reportDataSources";

const BDT_SYMBOL = "\u09F3";

function CurrencyText({ value }) {
  const formatted = formatCurrency(value);

  return (
    <>
      <span className="currency-symbol">{formatted.slice(0, 1)}</span>
      {formatted.slice(1)}
    </>
  );
}

function EmptyRows({ colSpan, label }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[16px] text-[#667085]">
        {label}
      </td>
    </tr>
  );
}

function ReportCard({ title, children, className = "" }) {
  return (
    <article className={`mt-10 rounded-[15px] border border-[#dedede] bg-white px-[30px] py-[30px] ${className}`}>
      <h2 className="text-[20px] font-bold leading-none text-[#171717]">{title}</h2>
      {children}
    </article>
  );
}

function RawMaterialsReport({ data }) {
  const rows = data.rows || [];

  return (
    <ReportCard title="Raw Material Usage Report">
      <div className="mt-10 overflow-x-auto">
        <table className="min-w-[780px] w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {["Material", "Quantity Used", "Unit", "Total Cost"].map((header) => (
                <th key={header} className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.material}-${row.unit}`} className={index % 2 === 1 ? "bg-[#f3f4f7]" : "bg-white"}>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">{row.material}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#171717]">{formatPlainNumber(row.quantityUsed)}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#171717]">{row.unit}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">
                  <CurrencyText value={row.totalCost} />
                </td>
              </tr>
            ))}

            {rows.length === 0 ? <EmptyRows colSpan={4} label="No raw material data found." /> : null}

            {rows.length > 0 ? (
              <tr className="bg-[#f8fafc]">
                <td className="px-3 py-4 text-[18px] font-bold text-[#171717]" colSpan={3}>
                  Total
                </td>
                <td className="px-3 py-4 text-[24px] font-extrabold leading-none text-[#111827]">
                  <CurrencyText value={data.totalCost} />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ReportCard>
  );
}

function ProductionReport({ data }) {
  const rows = data.rows || [];

  return (
    <ReportCard title="Production Report">
      <div className="mt-10 overflow-x-auto">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {["Date", "Batch", "Mix Name", "Input (kg)", "Output (kg)", "Loss (kg)", "Efficiency"].map((header) => (
                <th key={header} className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#171717]">{row.date || "-"}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[16px] font-mono text-[#171717]">{row.batch}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">{row.mixName}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#171717]">{formatPlainNumber(row.inputKg)}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#00a846]">{formatPlainNumber(row.outputKg)}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#ff0000]">{formatPlainNumber(row.lossKg)}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#00a846]">{safeNumber(row.efficiency).toFixed(1)}%</td>
              </tr>
            ))}

            {rows.length === 0 ? <EmptyRows colSpan={7} label="No production history found." /> : null}
          </tbody>
        </table>
      </div>
    </ReportCard>
  );
}

function PackagingReport({ data }) {
  const rows = data.rows || [];

  return (
    <ReportCard title="Packaging Report">
      <div className="mt-10 overflow-x-auto">
        <table className="min-w-[860px] w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {["Date", "Product", "Packet Size", "Quantity Packaged"].map((header) => (
                <th key={header} className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-[#dedede] px-3 py-4 text-[18px] text-[#171717]">{row.date || "-"}</td>
                <td className="border-b border-[#dedede] px-3 py-4 text-[18px] font-bold text-[#171717]">{row.product}</td>
                <td className="border-b border-[#dedede] px-3 py-4 text-[18px]">
                  <span className="inline-flex rounded-[5px] bg-[#dfe4ff] px-2.5 py-1 text-[14px] font-bold text-[#4f35f2]">
                    {row.packetSize}
                  </span>
                </td>
                <td className="border-b border-[#dedede] px-3 py-4 text-[18px] font-bold text-[#171717]">
                  {formatPlainNumber(row.quantityPackaged)} packets
                </td>
              </tr>
            ))}

            {rows.length === 0 ? <EmptyRows colSpan={4} label="No packaging history found." /> : null}
          </tbody>
        </table>
      </div>
    </ReportCard>
  );
}

function SalesReport({ data }) {
  const rows = data.rows || [];
  const totals = data.totals || { total: 0, paid: 0, due: 0 };

  return (
    <ReportCard title="Sales Report">
      <div className="mt-10 overflow-x-auto">
        <table className="min-w-[920px] w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {["Date", "Invoice", "Customer", "Total", "Paid", "Due"].map((header) => (
                <th key={header} className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#171717]">{row.date || "-"}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[16px] font-mono font-bold text-[#171717]">{row.invoice}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]">{row.customer}</td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] font-bold text-[#171717]"><CurrencyText value={row.total} /></td>
                <td className="border-b border-[#dedede] px-3 py-3 text-[18px] text-[#00a846]"><CurrencyText value={row.paid} /></td>
                <td className={["border-b border-[#dedede] px-3 py-3 text-[18px]", row.due > 0 ? "font-bold text-[#ff0000]" : "text-[#00a846]"].join(" ")}>
                  <CurrencyText value={row.due} />
                </td>
              </tr>
            ))}

            {rows.length === 0 ? <EmptyRows colSpan={6} label="No sales found." /> : null}

            {rows.length > 0 ? (
              <tr className="bg-[#f8fafc]">
                <td className="px-3 py-4 text-[18px] font-bold text-[#171717]" colSpan={3}>Total</td>
                <td className="px-3 py-4 text-[18px] font-bold text-[#171717]"><CurrencyText value={totals.total} /></td>
                <td className="px-3 py-4 text-[18px] font-bold text-[#00a846]"><CurrencyText value={totals.paid} /></td>
                <td className="px-3 py-4 text-[18px] font-bold text-[#ff0000]"><CurrencyText value={totals.due} /></td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </ReportCard>
  );
}

function SummaryIcon({ type }) {
  if (type === "revenue") {
    return <span className="text-[26px] font-medium leading-none text-[#00b050]">{BDT_SYMBOL}</span>;
  }

  if (type === "expense") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#ff0000]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16 10 10l4 4 6-7" />
        <path d="M15 7h5v5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#4f46ff]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 13h6" />
      <path d="M10 17h4" />
    </svg>
  );
}

function ProfitSummaryCards({ summary, periodLabel }) {
  const cards = [
    { key: "revenue", title: "Total Revenue", value: summary.revenue, className: "text-[#00a846]" },
    { key: "expense", title: "Total Expense", value: summary.expense, className: "text-[#e60000]" },
    { key: "profit", title: "Net Profit", value: summary.profit, className: "text-[#5751f7]" },
  ];

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-3">
      {cards.map((card) => (
        <article key={card.key} className="rounded-[15px] border border-[#dedede] bg-white px-[30px] py-[34px]">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[18px] font-bold text-[#536176]">{card.title}</p>
            <SummaryIcon type={card.key} />
          </div>
          <p className={`mt-12 text-[30px] font-extrabold leading-none ${card.className}`}>
            <CurrencyText value={card.value} />
          </p>
          <p className="mt-3 text-[16px] text-[#536176]">{periodLabel}</p>
        </article>
      ))}
    </div>
  );
}

function formatTooltipNumber(value) {
  return String(Math.round(safeNumber(value)));
}

function ChartGrid({ yTicks, maxValue, width, height, leftPad, bottomPad, children, labels }) {
  const chartHeight = height - bottomPad - 24;
  const chartWidth = width - leftPad - 28;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full min-w-[760px]" role="img" aria-label="Report chart">
      {yTicks.map((tick) => {
        const y = 24 + chartHeight - (tick / maxValue) * chartHeight;
        return (
          <g key={tick}>
            <line x1={leftPad} x2={leftPad + chartWidth} y1={y} y2={y} stroke="#d8d8d8" strokeDasharray="4 4" />
            <text x={leftPad - 10} y={y + 6} textAnchor="end" className="fill-[#6b6b6b] text-[18px]">
              {Math.round(tick)}
            </text>
          </g>
        );
      })}
      <line x1={leftPad} x2={leftPad} y1={24} y2={24 + chartHeight} stroke="#777" />
      <line x1={leftPad} x2={leftPad + chartWidth} y1={24 + chartHeight} y2={24 + chartHeight} stroke="#777" />
      {children({ chartHeight, chartWidth, leftPad, topPad: 24, baseY: 24 + chartHeight })}
      {labels.map((label, index) => {
        const step = chartWidth / labels.length;
        const x = leftPad + step * index + step / 2;
        return (
          <text key={label} x={x} y={height - 18} textAnchor="middle" className="fill-[#6b6b6b] text-[18px]">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function RevenueExpenseChart({ rows }) {
  const [hoveredMonthKey, setHoveredMonthKey] = useState(null);
  const maxValue = Math.max(100000, ...rows.flatMap((row) => [row.revenue, row.expense]));
  const roundedMax = Math.ceil(maxValue / 25000) * 25000;
  const yTicks = [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax];

  return (
    <ReportCard title="Revenue vs Expense Trend" className="px-[28px]">
      <div className="mt-8 overflow-x-auto">
        <ChartGrid yTicks={yTicks} maxValue={roundedMax} width={980} height={380} leftPad={96} bottomPad={58} labels={rows.map((row) => row.label)}>
          {({ chartHeight, chartWidth, leftPad, topPad, baseY }) => {
            const step = chartWidth / Math.max(rows.length, 1);
            const barWidth = Math.min(92, step * 0.38);
            const hoveredIndex = rows.findIndex((row) => row.monthKey === hoveredMonthKey);
            const hoveredRow = hoveredIndex >= 0 ? rows[hoveredIndex] : null;
            const tooltipWidth = 184;
            const tooltipHeight = 126;
            const tooltip = hoveredRow
              ? (() => {
                  const center = leftPad + step * hoveredIndex + step / 2;
                  const revenueHeight = (hoveredRow.revenue / roundedMax) * chartHeight;
                  const expenseHeight = (hoveredRow.expense / roundedMax) * chartHeight;
                  const tallestBarHeight = Math.max(revenueHeight, expenseHeight);
                  const tooltipX = Math.min(
                    Math.max(leftPad + 8, center + 18),
                    leftPad + chartWidth - tooltipWidth - 8
                  );
                  const tooltipY = Math.max(
                    topPad + 8,
                    Math.min(baseY - tooltipHeight - 8, baseY - tallestBarHeight - tooltipHeight - 12)
                  );

                  return (
                    <foreignObject
                      key="revenue-expense-tooltip"
                      x={tooltipX}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      pointerEvents="none"
                    >
                      <div
                        xmlns="http://www.w3.org/1999/xhtml"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #d6d6d6",
                          boxShadow: "0 12px 26px rgba(15, 23, 42, 0.12)",
                          color: "#111827",
                          fontFamily: "Arial, Helvetica, sans-serif",
                          height: "100%",
                          padding: "16px 14px",
                          width: "100%",
                        }}
                      >
                        <p style={{ fontSize: "20px", lineHeight: 1, margin: 0 }}>
                          {hoveredRow.label}
                        </p>
                        <p style={{ color: "#00a846", fontSize: "18px", lineHeight: 1, margin: "18px 0 0" }}>
                          Revenue : {formatTooltipNumber(hoveredRow.revenue)}
                        </p>
                        <p style={{ color: "#ff3131", fontSize: "18px", lineHeight: 1, margin: "20px 0 0" }}>
                          Expense : {formatTooltipNumber(hoveredRow.expense)}
                        </p>
                      </div>
                    </foreignObject>
                  );
                })()
              : null;

            return (
              <>
                {rows.map((row, index) => {
                  const center = leftPad + step * index + step / 2;
                  const revenueHeight = (row.revenue / roundedMax) * chartHeight;
                  const expenseHeight = (row.expense / roundedMax) * chartHeight;
                  const animationDelay = `${index * 90}ms`;

                  return (
                    <g
                      key={row.monthKey}
                      aria-label={`${row.label} revenue ${formatTooltipNumber(row.revenue)}, expense ${formatTooltipNumber(row.expense)}`}
                      className="report-chart-column"
                      onBlur={() => setHoveredMonthKey(null)}
                      onFocus={() => setHoveredMonthKey(row.monthKey)}
                      onMouseEnter={() => setHoveredMonthKey(row.monthKey)}
                      onMouseLeave={() => setHoveredMonthKey(null)}
                      role="img"
                      tabIndex={0}
                    >
                      <line x1={center} x2={center} y1={topPad} y2={baseY} stroke="#d8d8d8" strokeDasharray="4 4" />
                      <rect
                        x={center - barWidth - 3}
                        y={baseY - revenueHeight}
                        width={barWidth}
                        height={revenueHeight}
                        fill="#22c55e"
                        className="report-chart-bar"
                        style={{ animationDelay }}
                      />
                      <rect
                        x={center + 3}
                        y={baseY - expenseHeight}
                        width={barWidth}
                        height={expenseHeight}
                        fill="#ff4148"
                        className="report-chart-bar"
                        style={{ animationDelay: `${index * 90 + 80}ms` }}
                      />
                      <rect
                        x={leftPad + step * index}
                        y={topPad}
                        width={step}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                      />
                    </g>
                  );
                })}
                {tooltip}
              </>
            );
          }}
        </ChartGrid>
      </div>
    </ReportCard>
  );
}

function ProfitTrendChart({ rows }) {
  const values = rows.map((row) => row.profit);
  const maxAbs = Math.max(60000, ...values.map((value) => Math.abs(value)));
  const maxValue = Math.ceil(maxAbs / 15000) * 15000;
  const minValue = values.some((value) => value < 0) ? -maxValue : 0;
  const range = maxValue - minValue || 1;
  const yTicks = minValue < 0 ? [minValue, 0, maxValue * 0.5, maxValue] : [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];

  return (
    <ReportCard title="Profit Trend" className="px-[28px]">
      <div className="mt-8 overflow-x-auto">
        <svg viewBox="0 0 980 320" className="h-[320px] w-full min-w-[760px]" role="img" aria-label="Profit trend chart">
          {(() => {
            const leftPad = 96;
            const topPad = 24;
            const bottomPad = 58;
            const chartHeight = 320 - bottomPad - topPad;
            const chartWidth = 980 - leftPad - 32;
            const valueToY = (value) => topPad + ((maxValue - value) / range) * chartHeight;
            const step = chartWidth / Math.max(rows.length - 1, 1);
            const points = rows.map((row, index) => ({
              x: rows.length === 1 ? leftPad + chartWidth / 2 : leftPad + step * index,
              y: valueToY(row.profit),
              row,
            }));
            const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

            return (
              <>
                {yTicks.map((tick) => {
                  const y = valueToY(tick);
                  return (
                    <g key={tick}>
                      <line x1={leftPad} x2={leftPad + chartWidth} y1={y} y2={y} stroke="#d8d8d8" strokeDasharray="4 4" />
                      <text x={leftPad - 10} y={y + 6} textAnchor="end" className="fill-[#6b6b6b] text-[18px]">
                        {Math.round(tick)}
                      </text>
                    </g>
                  );
                })}
                <line x1={leftPad} x2={leftPad} y1={topPad} y2={topPad + chartHeight} stroke="#777" />
                <line x1={leftPad} x2={leftPad + chartWidth} y1={topPad + chartHeight} y2={topPad + chartHeight} stroke="#777" />
                {points.map((point) => (
                  <line key={`grid-${point.row.monthKey}`} x1={point.x} x2={point.x} y1={topPad} y2={topPad + chartHeight} stroke="#d8d8d8" strokeDasharray="4 4" />
                ))}
                <polyline points={linePoints} fill="none" stroke="#5751f7" strokeWidth="3" />
                {points.map((point) => (
                  <circle key={point.row.monthKey} cx={point.x} cy={point.y} r="4" fill="white" stroke="#5751f7" strokeWidth="3" />
                ))}
                {rows.map((row, index) => {
                  const point = points[index];
                  return (
                    <text key={row.monthKey} x={point.x} y={306} textAnchor="middle" className="fill-[#6b6b6b] text-[18px]">
                      {row.label}
                    </text>
                  );
                })}
              </>
            );
          })()}
        </svg>
      </div>
    </ReportCard>
  );
}

function ProfitLossReport({ data }) {
  const summary = data.summary || { revenue: 0, expense: 0, profit: 0 };
  const monthlyRows = data.monthlyRows || [];
  const chartKey = monthlyRows
    .map((row) => `${row.monthKey}:${row.revenue}:${row.expense}`)
    .join("|");

  return (
    <>
      <ProfitSummaryCards summary={summary} periodLabel={data.periodLabel || "All time"} />
      <RevenueExpenseChart key={`revenue-expense-${chartKey}`} rows={monthlyRows} />
      <ProfitTrendChart rows={monthlyRows} />
    </>
  );
}

function ActiveReport({ activeReportKey, data }) {
  switch (activeReportKey) {
    case "production":
      return <ProductionReport data={data} />;
    case "packaging":
      return <PackagingReport data={data} />;
    case "sales":
      return <SalesReport data={data} />;
    case "profit-loss":
      return <ProfitLossReport data={data} />;
    case "raw-materials":
    default:
      return <RawMaterialsReport data={data} />;
  }
}

export default function ReportsDataClient({ activeReportKey }) {
  const [reportData, setReportData] = useState(() =>
    buildReportData(activeReportKey, { useStoredData: false })
  );

  useEffect(() => {
    const refreshReportData = () => {
      setReportData(buildReportData(activeReportKey));
    };

    refreshReportData();
    window.addEventListener("storage", refreshReportData);
    window.addEventListener("focus", refreshReportData);

    return () => {
      window.removeEventListener("storage", refreshReportData);
      window.removeEventListener("focus", refreshReportData);
    };
  }, [activeReportKey]);

  return <ActiveReport key={activeReportKey} activeReportKey={activeReportKey} data={reportData} />;
}
