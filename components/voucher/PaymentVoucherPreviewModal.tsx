"use client";

import { downloadReceiptAsPDF } from "@/libs/pdf/downloadReceiptAsPDF";
import { Button } from "flowbite-react";
import { HiDownload } from "react-icons/hi";
import PaymentVoucherCard from "./PaymentVoucherCard";

type Props = {
  open: boolean;
  data: any; 
  onClose: () => void;
};

export default function PaymentVoucherPreviewModal({
  open,
  data,
  onClose,
}: Props) {
  if (!open || !data) return null;

  const handleDownload = async () => {
    const el = document.getElementById("voucher-root");
    if (!el) return;

    await downloadReceiptAsPDF({
      element: el,
      filename: `PaymentVoucher_${data.voucherNo || "Draft"}.pdf`,
      scale: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50">
          <h3 className="text-xl font-semibold text-gray-800">
            Payment Voucher Preview
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
        <div className="flex-1 overflow-auto bg-gray-200 p-8">
          <div className="flex justify-center min-w-fit">
            <div className="shadow-xl bg-white">
              <PaymentVoucherCard data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
