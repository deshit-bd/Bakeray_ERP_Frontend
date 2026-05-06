"use client";

import dynamic from "next/dynamic";

const LazyTableImportDialog = dynamic(() => import("./TableImportDialog"), {
  ssr: false,
  loading: () => null,
});

export default LazyTableImportDialog;
