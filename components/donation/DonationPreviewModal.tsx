"use client";

import DonationReceiptCard from "@/components/donation/DonationReceiptCard";
import { Button } from "flowbite-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import { useState } from "react";
import { HiDownload } from "react-icons/hi";

type Props = {
  open: boolean;
  data: any;
  onClose: () => void;
};

export default function DonationPreviewModal({ open, data, onClose }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!open || !data) return null;

  const handleDownload = async () => {
    const element = document.getElementById("donation-receipt-root");
    if (!element) return;

    setIsDownloading(true);

    try {
      // 1. Capture the element with html2canvas-pro
      const canvas = await html2canvas(element, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY, // Fix for scrolling offset issues
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // 2. Convert canvas to image data
      const imgData = canvas.toDataURL("image/png");

      // 3. Define PDF dimensions (A4 in points: 595.28 x 841.89)
      const pdfWidth = 595.28;
      // Calculate height maintaining aspect ratio
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // 4. Create jsPDF instance
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: [pdfWidth, pdfHeight],
      });

      // 5. Add image to PDF
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // 6. Save the PDF
      pdf.save(`Donation_${data.receiptNumber || "Receipt"}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[95vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-gray-50 rounded-t-lg">
          <h3 className="text-xl font-semibold text-gray-800">
            Donation Receipt Preview
          </h3>
          <div className="flex gap-3">
            <Button color="gray" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              color="blue"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <HiDownload className="mr-2 h-4 w-4" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto bg-gray-500/10 p-8">
          <div className="flex justify-center">
            {/* Wrapper to ensure we don't accidentally clip shadows in preview */}
            <div className="shadow-lg">
              <DonationReceiptCard data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
