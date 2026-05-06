"use client";

import { useRef, useState } from "react";
import { buildImportPreview, readTableFile } from "../utils/tableImport";

export function useTableImport({
  columns,
  existingRows,
  keyField = "id",
  transformRow,
  onApply,
}) {
  const inputRef = useRef(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setIsLoading(false);
    setErrorMessage("");
    setFileName("");
    setPreview(null);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsDialogOpen(true);
    setIsLoading(true);
    setErrorMessage("");
    setFileName(file.name);
    setPreview(null);

    try {
      const fileRows = await readTableFile(file);
      const nextPreview = buildImportPreview({
        fileRows,
        columns,
        existingRows,
        keyField,
        transformRow,
      });
      setPreview(nextPreview);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not import this file.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = () => {
    if (!preview) {
      return;
    }

    onApply(preview.mergedRows);
    closeDialog();
  };

  return {
    inputRef,
    isDialogOpen,
    isLoading,
    errorMessage,
    fileName,
    preview,
    openFilePicker,
    handleFileChange,
    closeDialog,
    confirmImport,
  };
}
