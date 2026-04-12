"use client";

import { getYearlyExportTransactions } from "@/app/actions/finance-export";
import { ExportColumn, exportToXlsx } from "@/libs/export/xlsx";
import { Button } from "flowbite-react";
import { Download } from "lucide-react";
import { useState } from "react";

type Props = {
  yearId: string;
  fileName: string;
  columns: ExportColumn[];
  preface: Record<string, any>[];
};

export function YearlyExportButton({
  yearId,
  fileName,
  columns,
  preface,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await getYearlyExportTransactions(yearId);
      exportToXlsx(data, {
        fileName,
        columns,
        preface,
        sheetName: "Yearly Transactions",
      });
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button color="light" onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Exporting Data..." : "Export FY Report"}
    </Button>
  );
}
