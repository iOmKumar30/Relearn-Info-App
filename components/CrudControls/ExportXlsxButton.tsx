"use client";

import { ExportColumn, exportToXlsx } from "@/libs/export/xlsx";
import { Button, Dropdown, DropdownItem } from "flowbite-react";
import { Download } from "lucide-react";
import { useState } from "react";

type Props = {
  fileName: string;
  columns?: ExportColumn[];
  visibleRows: Record<string, any>[];
  fetchAll?: () => Promise<Record<string, any>[]>;
  sheetName?: string;
};

export default function ExportXlsxButton({
  fileName,
  columns,
  visibleRows,
  fetchAll,
  sheetName,
}: Props) {
  const [busy, setBusy] = useState<"visible" | "all" | null>(null);

  const onExportVisible = async () => {
    try {
      setBusy("visible");
      exportToXlsx(visibleRows, { fileName, columns, sheetName });
    } finally {
      setBusy(null);
    }
  };

  const onExportAll = async () => {
    if (!fetchAll) return;
    try {
      setBusy("all");
      const all = await fetchAll();
      exportToXlsx(all, { fileName, columns, sheetName });
    } finally {
      setBusy(null);
    }
  };

  if (!fetchAll) {
    return (
      <Button color="light" onClick={onExportVisible} disabled={busy !== null}>
        <Download className="mr-2 h-4 w-4" />
        {busy === "visible" ? "Exporting…" : "Export XLSX"}
      </Button>
    );
  }

  return (
    <Dropdown
      label={
        <span className="inline-flex items-center">
          <Download className="mr-2 h-4 w-4" />
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
