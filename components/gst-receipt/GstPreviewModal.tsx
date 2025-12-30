"use client";

import GstReceiptCard from "@/components/gst-receipt/GstReceiptCard";
import { downloadReceiptAsPDF } from "@/libs/pdf/downloadReceiptAsPDF";
import { Button } from "flowbite-react";
import { useRef } from "react";
import { HiDownload } from "react-icons/hi";

type Props = {
  open: boolean;
  data: any;
  onClose: () => void;
};

export default function GstPreviewModal({ open, data, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  if (!open || !data) return null;

  const handleDownload = async () => {
    const el = document.getElementById("receipt-root");
    if (!el) return;

    await downloadReceiptAsPDF({
      element: el,
      filename: `Receipt_${data.invoiceNo || "Draft"}.pdf`,
      scale: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50 rounded-t-lg">
          <h3 className="text-xl font-semibold text-gray-800">
            GST Receipt Preview
          </h3>
          <div className="flex gap-3">
            <Button color="gray" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button color="blue" size="sm" onClick={handleDownload}>
              <HiDownload className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto bg-gray-500/10 p-8">
          <div className="flex justify-center">
            {/* 
                Scale wrapper to fit large A4 div in view if needed, 
                but usually scroll is better for fidelity 
            */}
            <div className="shadow-lg">
              <GstReceiptCard data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
