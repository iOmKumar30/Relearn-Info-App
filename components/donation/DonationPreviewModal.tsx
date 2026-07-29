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
      // Capture at print-quality resolution. 2x keeps text sharp without the
      // multi-megabyte PNG produced by the previous 4x capture.
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY, // Fix for scrolling offset issues
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      // JPEG compression makes this a compact, single-page receipt. PNG stores
      // the entire high-resolution canvas losslessly and was causing 50+ MB PDFs.
      const imgData = canvas.toDataURL("image/jpeg", 0.8);

      // Use jsPDF's named A4 format instead of deriving the page height from the
      // canvas, which could create a non-A4 PDF when the card was rendered taller.
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Keep every part of a receipt visible. If its content is slightly taller
      // than A4, scale it down proportionally and centre it on the A4 page.
      const pageWidth = 210;
      const pageHeight = 297;
      const imageRatio = canvas.width / canvas.height;
      const pageRatio = pageWidth / pageHeight;
      const imageWidth =
        imageRatio > pageRatio ? pageWidth : pageHeight * imageRatio;
      const imageHeight =
        imageRatio > pageRatio ? pageWidth / imageRatio : pageHeight;
      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - imageHeight) / 2;

      pdf.addImage(
        imgData,
        "JPEG",
        x,
        y,
        imageWidth,
        imageHeight,
        undefined,
        "FAST"
      );

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
