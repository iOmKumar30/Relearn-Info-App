"use client";

import { uploadMonthlyStatement } from "@/app/actions/finance";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
export function UploadStatementButton({
  monthId,
  isLocked,
}: {
  monthId: string;
  isLocked: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Uploading a statement will merge/add transactions. Manual edits to existing transaction IDs will be preserved. Continue?"
      )
    ) {
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadMonthlyStatement(formData, monthId);
    setLoading(false);

    if (res.success) {
      toast.success(res.message || "Statement uploaded successfully");
    } else {
      toast.error(res.error || "Upload failed");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <input
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLocked || loading}
        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {loading ? "Processing..." : "Upload Excel"}
      </button>
    </>
  );
}
