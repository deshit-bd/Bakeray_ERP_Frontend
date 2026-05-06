export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function parseNumericValue(value) {
  const normalized = String(value ?? "").replace(/[^0-9.-]+/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}


export function inferStockStatus(row, {
  currentStockKeys = ["currentStock", "stock", "quantity", "qty"],
  minimumStockKeys = ["minimumStock", "minStock", "minimum", "reorderLevel"],
  lowLabel = "low",
  enoughLabel = "enough",
} = {}) {
  const findValue = (keys) => {
    const key = keys.find((candidate) =>
      Object.prototype.hasOwnProperty.call(row || {}, candidate)
    );
    return key ? row?.[key] : "";
  };

  const currentStockValue = parseNumericValue(findValue(currentStockKeys));
  const minimumStockValue = parseNumericValue(findValue(minimumStockKeys));

  if (minimumStockValue <= 0 && currentStockValue <= 0) {
    return lowLabel;
  }

  return currentStockValue <= minimumStockValue ? lowLabel : enoughLabel;
}

function autoCompleteImportedRow(row, columns) {
  const nextRow = { ...(row || {}) };
  const normalizedColumnKeys = new Set(
    columns.map((column) => normalizeHeader(column.key || column.label))
  );
  const originalTableHasStatusColumn = normalizedColumnKeys.has("status");
  const originalTableHasActionsColumn =
    normalizedColumnKeys.has("actions") || normalizedColumnKeys.has("action");
  const hasStockColumns =
    Object.prototype.hasOwnProperty.call(nextRow, "currentStock") &&
    Object.prototype.hasOwnProperty.call(nextRow, "minimumStock");

  // Actions are UI buttons in the original table, not Excel data.
  // Keep them only for tables that actually render an Actions column, and let
  // the component render its normal Edit/Delete/View buttons for imported rows.
  if (!originalTableHasActionsColumn) {
    delete nextRow.action;
    delete nextRow.actions;
  }

  // Status should exist only when the original table has a status column.
  // For stock tables, status is calculated from stock values so imported rows
  // behave like manually created rows. For other tables, component transforms
  // can provide their own default status (Pending/Paid/Completed/etc.).
  if (originalTableHasStatusColumn && hasStockColumns) {
    nextRow.status = inferStockStatus(nextRow);
  }

  if (!originalTableHasStatusColumn) {
    delete nextRow.status;
  }

  return nextRow;
}

export function getRawCellValue(row, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const matchingKey = Object.keys(row || {}).find((key) =>
    normalizedAliases.includes(normalizeHeader(key))
  );

  return matchingKey ? String(row?.[matchingKey] ?? "").trim() : "";
}

export function getNextPrefixedId(rows, prefix, key = "id", offset = 0) {
  const maxId = rows.reduce((currentMax, row) => {
    const numericId = Number(String(row?.[key] ?? "").replace(`${prefix}-`, ""));
    return Number.isNaN(numericId) ? currentMax : Math.max(currentMax, numericId);
  }, 0);

  return `${prefix}-${String(maxId + 1 + offset).padStart(3, "0")}`;
}

export async function readTableFile(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });
}

function mergeRowsByKey(existingRows, importedRows, keyField) {
  const existingKeys = new Set(
    existingRows
      .map((row) => String(row?.[keyField] ?? "").trim())
      .filter(Boolean)
  );
  const importSeenKeys = new Set();
  let duplicateCount = 0;

  importedRows.forEach((row) => {
    const rowKey = String(row?.[keyField] ?? "").trim();

    if (!rowKey) {
      return;
    }

    if (existingKeys.has(rowKey) || importSeenKeys.has(rowKey)) {
      duplicateCount += 1;
    }

    importSeenKeys.add(rowKey);
  });

  return {
    mergedRows: [...existingRows, ...importedRows],
    updatedCount: 0,
    addedCount: importedRows.length,
    duplicateCount,
  };
}

export function buildImportPreview({
  fileRows,
  columns,
  existingRows,
  keyField = "id",
  transformRow,
}) {
  if (!Array.isArray(fileRows) || fileRows.length === 0) {
    throw new Error("The selected file does not contain any rows.");
  }

  const fileHeaders = Array.from(
    fileRows.reduce((accumulator, row) => {
      Object.keys(row || {}).forEach((header) => accumulator.add(header));
      return accumulator;
    }, new Set())
  );

  const headerMap = {};
  const matchedHeaders = [];

  columns.forEach((column) => {
    const aliases = [column.label, column.key, ...(column.aliases || [])].map(normalizeHeader);
    const matchedHeader = fileHeaders.find((header) => aliases.includes(normalizeHeader(header)));

    if (matchedHeader) {
      headerMap[column.key] = matchedHeader;
      matchedHeaders.push(matchedHeader);
    }
  });

  const missingRequired = columns
    .filter((column) => column.required !== false && !headerMap[column.key])
    .map((column) => column.label);

  if (missingRequired.length > 0) {
    throw new Error(`Missing required headers: ${missingRequired.join(", ")}`);
  }

  const preparedRows = fileRows
    .map((rawRow, index) => {
      const draft = columns.reduce((row, column) => {
        const header = headerMap[column.key];
        row[column.key] = header ? String(rawRow?.[header] ?? "").trim() : "";
        return row;
      }, {});

      const transformedRow = transformRow
        ? transformRow(draft, { index, rawRow, existingRows })
        : draft;

      return autoCompleteImportedRow(transformedRow, columns);
    })
    .filter(
      (row) =>
        row &&
        Object.values(row).some((value) => String(value ?? "").trim() !== "")
    );

  if (preparedRows.length === 0) {
    throw new Error("No valid rows were found after matching the file headers.");
  }

  const { mergedRows, updatedCount, addedCount, duplicateCount } = mergeRowsByKey(
    existingRows,
    preparedRows,
    keyField
  );

  return {
    fileHeaders,
    matchedHeaders,
    unmatchedHeaders: fileHeaders.filter((header) => !matchedHeaders.includes(header)),
    importedRows: preparedRows,
    mergedRows,
    updatedCount,
    addedCount,
    duplicateCount,
    existingCount: existingRows.length,
    totalAfterImport: mergedRows.length,
  };
}
