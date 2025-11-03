"use client";

import CertificateCard from "@/components/certificates/CertificateCard";
import { downloadElementAsPDF } from "@/libs/pdf/downloadFromElement";
import { Button } from "flowbite-react";
import { useRef } from "react";

export default function CertificatePreviewModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: {
    id: string;
    name: string;
    year: string;
    dateIssued: string;
    certificateNo: string;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handleDownload = async () => {
    if (!ref.current) return;
    const el = ref.current.querySelector("#certificate-root") as HTMLElement;
    await downloadElementAsPDF({
      element: el,
      filename: `${data.certificateNo}.pdf`,
      scale: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-medium">Preview Certificate</div>
          <div className="flex gap-2">
            <Button color="light" onClick={onClose}>
              Close
            </Button>
            <Button color="dark" onClick={handleDownload}>Download PDF</Button>
          </div>
        </div>

        <div ref={ref} className="flex justify-center">
          <CertificateCard
            name={data.name}
            year={data.year}
            date={data.dateIssued}
          />
        </div>
      </div>
    </div>
  );
}
