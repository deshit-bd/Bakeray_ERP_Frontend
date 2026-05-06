"use client";

import { useState } from "react";
import RawMaterialProductionPanel from "./RawMaterialProductionPanel";
import RepackingProductionPanel from "./RepackingProductionPanel";

const topTabs = ["Raw Material Production", "Repacking Production"];

function CubeIcon({ color, bgColor }) {
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-[14px]"
      style={{ backgroundColor: bgColor }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3 7 4-7 4-7-4 7-4Z" />
        <path d="m5 7 7 4 7-4" />
        <path d="M5 7v8l7 4 7-4V7" />
      </svg>
    </span>
  );
}

function ArrowStepIcon({ color }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="hidden h-8 w-8 shrink-0 lg:block"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function ProductionManagement() {
  const [activeTopTab, setActiveTopTab] = useState("Raw Material Production");

  return (
    <section className="min-w-0 flex-1 bg-[#f6f8fc] px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#181d27]">
              Production &amp; Repacking
            </h1>
            <p className="mt-1 text-[15px] text-[#667085]">
              Manage production batches and repacking operations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {topTabs.map((tab) => {
              const active = activeTopTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTopTab(tab)}
                  className={[
                    "inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-[14px] font-medium transition",
                    active
                      ? "bg-[#2f66e3] text-white shadow-[0_10px_24px_rgba(47,102,227,0.2)]"
                      : "border border-[#2f66e3] bg-white text-[#181d27] hover:bg-[#f8fbff]",
                  ].join(" ")}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-[22px] border p-5 shadow-[0_10px_25px_rgba(15,23,42,0.04)]"
            style={{
              borderColor: "var(--production-flow-border)",
              background: "var(--production-flow-bg)",
            }}
          >
            <h2
              className="text-[16px] font-semibold"
              style={{ color: "var(--production-flow-title)" }}
            >
              {activeTopTab === "Raw Material Production"
                ? "Raw Material Production Flow"
                : "Repacking Production Flow"}
            </h2>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center">
              <div
                className="min-w-0 flex-1 rounded-[16px] border px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                style={{
                  borderColor: "var(--production-step-border)",
                  background: "var(--production-step-bg)",
                }}
              >
                <CubeIcon color="#2563eb" bgColor="#e7f0ff" />
                <h3
                  className="mt-4 text-[18px] font-semibold"
                  style={{ color: "var(--production-step-title)" }}
                >
                  Raw Material Stock
                </h3>
                <p
                  className="mt-1 text-[14px]"
                  style={{ color: "var(--production-step-text)" }}
                >
                  Warehouse A
                </p>
              </div>

              <ArrowStepIcon color="#2563eb" />

              <div
                className="min-w-0 flex-1 rounded-[16px] border px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                style={{
                  borderColor: "var(--production-step-border)",
                  background: "var(--production-step-bg)",
                }}
              >
                <CubeIcon color="#9333ea" bgColor="#f3e8ff" />
                <h3
                  className="mt-4 text-[18px] font-semibold"
                  style={{ color: "var(--production-step-title)" }}
                >
                  Production
                </h3>
                <p
                  className="mt-1 text-[14px]"
                  style={{ color: "var(--production-step-text)" }}
                >
                  Processing
                </p>
              </div>

              <ArrowStepIcon color="#16a34a" />

              <div
                className="min-w-0 flex-1 rounded-[16px] border px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                style={{
                  borderColor: "var(--production-step-border)",
                  background: "var(--production-step-bg)",
                }}
              >
                <CubeIcon color="#16a34a" bgColor="#dcfce7" />
                <h3
                  className="mt-4 text-[18px] font-semibold"
                  style={{ color: "var(--production-step-title)" }}
                >
                  Finished Goods
                </h3>
                <p
                  className="mt-1 text-[14px]"
                  style={{ color: "var(--production-step-text)" }}
                >
                  Ready for Sale
                </p>
              </div>
            </div>
          </div>

          {activeTopTab === "Raw Material Production" ? (
            <RawMaterialProductionPanel />
          ) : (
            <RepackingProductionPanel />
          )}
        </div>
      </div>
    </section>
  );
}
