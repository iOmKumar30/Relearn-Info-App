"use client";

import CertificateCard from "@/components/part-cert/CertificateCard";
import { downloadElementAsPDF } from "@/libs/pdf/downloadFromElement";
import { Button } from "flowbite-react";
import { useRef } from "react";
import { HiDownload } from "react-icons/hi";

type Props = {
  open: boolean;
  data: any;
  onClose: () => void;
};

export default function CertificatePreviewModal({
  open,
  data,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  if (!open || !data) return null;

  const handleDownload = async () => {
    const el = document.getElementById("certificate-root");
    if (!el) return;

    await downloadElementAsPDF({
      element: el,
      filename: `Certificate_${data.certificateNo || data.name}.pdf`,
      scale: 2, // High res for print
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-xl font-semibold text-gray-800">
            Certificate Preview
          </h3>
          <div className="flex gap-2">
            <Button color="light" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button color="success" size="sm" onClick={handleDownload}>
              <HiDownload className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-8">
          <div className="flex justify-center min-w-[1150px]">
            <div ref={ref}>
              <CertificateCard
                // Pass the new Type prop
                type={data.type || "PARTICIPATION"}
                certificateNo={data.certificateNo}
                name={data.name}
                aadhaar={data.aadhaar}
                classYear={data.classYear}
                institute={data.institute}
                // Pass new Event Name prop (for Training)
                eventName={data.eventName}
                duration={data.duration}
                startDate={data.startDate}
                endDate={data.endDate}
                issueDate={data.issueDate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
