"use client";

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

export default function TableImportDialog({
  title,
  columns,
  isOpen,
  isLoading,
  errorMessage,
  fileName,
  preview,
  onClose,
  onConfirm,
}) {
  return (
    <div
      className={[
        "fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/40 p-4 transition",
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      <div className="flex max-h-[90vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eaecf0] px-5 py-4">
          <div>
            <h2 className="text-[22px] font-semibold text-[#181d27]">{title}</h2>
            <p className="mt-1 text-[13px] text-[#667085]">
              Review the matched headers and confirm before saving imported data.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#f8fafc]"
            aria-label="Close import preview"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="rounded-[14px] border border-[#dfe5ef] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#344054]">
            <span className="font-semibold">Selected file:</span> {fileName || "No file selected"}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[15px] text-[#667085]">
              Reading file and matching headers...
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="mt-4 rounded-[14px] border border-[#fecaca] bg-[#fff1f2] px-4 py-4 text-[14px] text-[#b42318]">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && preview ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">Existing Rows</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#181d27]">
                    {preview.existingCount}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">Imported Rows</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#181d27]">
                    {preview.importedRows.length}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">Duplicate IDs</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#2563eb]">
                    {preview.duplicateCount || 0}
                  </p>
                </div>
                <div className="rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                  <p className="text-[12px] text-[#667085]">New Rows</p>
                  <p className="mt-2 text-[24px] font-semibold text-[#16a34a]">
                    {preview.addedCount}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-[#dfe5ef] bg-white px-4 py-4">
                <p className="text-[13px] font-semibold text-[#181d27]">Header Match Report</p>
                <p className="mt-1 text-[13px] text-[#667085]">
                  {preview.matchedHeaders.length} matched headers found. Imported rows will be added after existing rows. Total rows after save will be{" "}
                  <span className="font-semibold text-[#181d27]">
                    {preview.totalAfterImport}
                  </span>
                  .
                </p>
                {preview.unmatchedHeaders.length > 0 ? (
                  <p className="mt-2 text-[13px] text-[#b54708]">
                    Ignored file headers: {preview.unmatchedHeaders.join(", ")}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#dfe5ef]">
                <div className="border-b border-[#eaecf0] bg-[#f9fafb] px-4 py-3 text-[13px] font-semibold text-[#475467]">
                  Result Preview
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left text-[13px] text-[#344054]">
                    <thead>
                      <tr className="bg-[#f9fafb]">
                        {columns.map((column) => (
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
                      {preview.mergedRows.slice(0, 20).map((row, rowIndex) => (
                        <tr key={`${row?.id || "row"}-${rowIndex}`} className="bg-white">
                          {columns.map((column) => (
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

              {preview.mergedRows.length > 20 ? (
                <p className="mt-3 text-[12px] text-[#667085]">
                  Showing first 20 rows from the final table preview.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eaecf0] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#d0d5dd] bg-white px-6 text-[14px] font-medium text-[#181d27] transition hover:bg-[#f8fafc]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!preview || isLoading}
            className={[
              "inline-flex h-11 items-center justify-center rounded-[12px] px-6 text-[14px] font-medium text-white transition",
              preview && !isLoading
                ? "bg-[#2f66e3] hover:bg-[#2459d6]"
                : "cursor-not-allowed bg-[#98a2b3]",
            ].join(" ")}
          >
            Add These Data
          </button>
        </div>
      </div>
    </div>
  );
}
