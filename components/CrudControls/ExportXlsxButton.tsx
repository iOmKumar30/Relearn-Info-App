"use client";

import type { ExportColumn } from "@/libs/export/xlsx";
import { Button, Dropdown, DropdownItem } from "flowbite-react";
import { Download } from "lucide-react";
import { useState } from "react";

type Props = {
  fileName: string;
  columns?: ExportColumn[];
  visibleRows: Record<string, any>[];
  fetchAll?: () => Promise<Record<string, any>[]>;
  sheetName?: string;
  preface?: any[]
};

export default function ExportXlsxButton({
  fileName,
  columns,
  visibleRows,
  fetchAll,
  sheetName,
  preface
}: Props) {
  const [busy, setBusy] = useState<"visible" | "all" | null>(null);

  const exportRows = async (rows: Record<string, any>[]) => {
    const { exportToXlsx } = await import("@/libs/export/xlsx");
    exportToXlsx(rows, { fileName, columns, sheetName, preface });
  };

  const onExportVisible = async () => {
    try {
      setBusy("visible");
      await exportRows(visibleRows);
    } finally {
      setBusy(null);
    }
  };

  const onExportAll = async () => {
    if (!fetchAll) return;
    try {
      setBusy("all");
      const all = await fetchAll();
      await exportRows(all);
    } finally {
      setBusy(null);
    }
  };

  if (!fetchAll) {
    return (
      <Button
        color="light"
        onClick={onExportVisible}
        disabled={busy !== null}
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" />
        {busy === "visible" ? "Exporting…" : "Export XLSX"}
      </Button>
    );
  }

  return (
    <Dropdown
      label={
        <span className="inline-flex w-full items-center justify-center sm:w-auto">
          <Download className="mr-2 h-4 w-4 shrink-0" />
          {busy ? "Exporting…" : "Export XLSX"}
        </span>
      }
      inline
    >
      <DropdownItem onClick={onExportVisible} disabled={busy !== null}>
        Current view (filtered)
      </DropdownItem>
      <DropdownItem onClick={onExportAll} disabled={busy !== null}>
        All rows
      </DropdownItem>
    </Dropdown>
  );
}
