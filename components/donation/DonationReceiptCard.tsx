"use client";

import { ToWords } from "to-words";

type DonationData = {
  receiptNumber: string;
  date: string | Date;
  reason: string;
  name: string;
  address: string;
  pan?: string;
  contact: string;
  email: string;
  amount: number;
  method: string;
  transactionId: string;
};

type Props = {
  data: DonationData;
  headerSrc?: string;
};

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  },
});

const defaultHeader = "/assets/relearn_header.png";

export default function DonationReceiptCard({
  data,
  headerSrc = defaultHeader,
}: Props) {
  if (!data) return null;

  const isoDate = new Date(data.date);

  const formattedDate = isoDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedDateTime = isoDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <div
      id="donation-receipt-root"
      className="bg-white text-gray-800 font-sans leading-relaxed mx-auto border border-gray-300 shadow-sm flex flex-col justify-between relative"
      style={{
        width: "210mm", // Exact A4 Width
        minHeight: "297mm", // Exact A4 Height
        padding: "0",
      }}
    >
      {/* 1. Header (Full Width) */}
      <div className="relative w-full h-[185px] mb-4 shrink-0">
        {/* Using standard <img> tag is often safer for PDF generation tools than Next/Image */}
        <img
          src={headerSrc}
          alt="Relearn Foundation Header"
          className="w-full h-full object-cover"
        />
      </div>

      {/* 2. Main Content */}
      <div className="px-12 flex-1 flex flex-col">
        <div className="text-left text-sm text-black mb-4 leading-snug space-y-1">
          <h1 className="font-bold text-lg mb-1">Relearn Foundation</h1>
          <p>2681, Vijaya Gardens, Baridih, Jamshedpur, Jharkhand 831017</p>
          <p>
            <span className="font-semibold">PAN:</span> AACTR5805Q
          </p>
          <p>
            <span className="font-semibold">80G Registration Number:</span>{" "}
            AACTR5805Q23PT02 dated 22-05-2024
          </p>
          <p>
            <span className="font-semibold">12A Registration Number:</span>{" "}
            AACTR5805Q23PT01 dated 22-05-2024
          </p>
          <p>
            <span className="font-semibold">GST No:</span> 20AACTR5805Q2Z9
          </p>
          <p>
            <span className="font-semibold">CSR-1:</span> CSR00012310 (MINISTRY
            OF CORPORATE AFFAIRS)
          </p>
        </div>

        <hr className="my-3 border-t-2 border-black" />
        <hr className="my-3 border-t-2 border-black" />

        <div className="flex justify-between items-center text-sm font-bold text-gray-900 mb-6 mt-2">
          <p>Receipt No: {data.receiptNumber}</p>
          <p>Date: {formattedDate}</p>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6 uppercase tracking-wide">
          Donation Receipt
        </h2>

        <div className="text-sm text-gray-800 mb-6">
          <p className="mb-3 font-bold">Thank you for your donation.</p>
          <p className="text-justify leading-relaxed">
            The amount you have given will make a difference as the proceeds
            help the Relearn Foundation to implement our mission in the areas of
            Education, Environment and Empowerment. This receipt is an
            attestation that we have gratefully received your generous
            contribution. Keep this receipt for your tax filing purposes.
          </p>
        </div>

        <div className="text-sm space-y-2 mb-6">
          <div className="grid grid-cols-[140px_1fr]">
            <span className="font-bold">Purpose:</span>
            <span>{data.reason}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="font-bold">Donor Name:</span>
            <span>{data.name}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="font-bold">Address:</span>
            <span>{data.address}</span>
          </div>
          {data.pan && (
            <div className="grid grid-cols-[140px_1fr]">
              <span className="font-bold">PAN No:</span>
              <span>{data.pan}</span>
            </div>
          )}
          <div className="grid grid-cols-[140px_1fr]">
            <span className="font-bold">Mobile No:</span>
            <span>{data.contact}</span>
          </div>
          <div className="grid grid-cols-[140px_1fr]">
            <span className="font-bold">Email:</span>
            <span>{data.email}</span>
          </div>
        </div>

        <div className="text-sm space-y-2 mb-8 bg-gray-50 p-4 rounded border border-gray-200">
          <div className="grid grid-cols-[160px_1fr]">
            <span className="font-bold">Donation Amount:</span>
            <span className="font-bold text-lg">
              {data.amount != null
                ? Number(data.amount).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"}
            </span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="font-bold">In words:</span>
            <span className="capitalize italic">
              {toWords.convert(Number(data.amount))} Only
            </span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="font-bold">Mode of Payment:</span>
            <span>{data.method?.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="font-bold">Transaction Ref No:</span>
            <span>{data.transactionId || "N/A"}</span>
          </div>
          <div className="grid grid-cols-[160px_1fr]">
            <span className="font-bold">Date Received:</span>
            <span>{formattedDateTime}</span>
          </div>
        </div>

        {/* Signatory Section - Pushed to bottom of Content area */}
        <div className="mt-auto mb-2">
          <div className="mb-6">
            <p className="font-bold">Authorized Signatory</p>
            <div className="h-10"></div> <p>Name: Dr Mita Tarafder</p>
            <p>Mobile No: 9852193175</p>
          </div>
          <hr className="border-t border-gray-400 mb-2" />
          <p className="text-xs italic text-gray-500 text-center">
            Donations made to Relearn Foundation (PAN-AACTR5805Q) are eligible
            for tax deduction under section 12A/80G. This is an autogenerated
            receipt.
          </p>
        </div>
      </div>

      {/* 3. Footer (Stick to Bottom, no overlap) */}
      <div className="w-full py-4 text-center text-xs text-gray-600 bg-white shrink-0">
        <div className="flex items-center justify-center mb-1 gap-2 px-12">
          <div className="h-px bg-gray-300 grow"></div>
          <span className="whitespace-nowrap font-semibold">
            relearn2015@gmail.com &nbsp; | &nbsp; +91-9334041104
          </span>
          <div className="h-px bg-gray-300 grow"></div>
        </div>
        <p className="mb-1">
          2681 Vijaya Garden, Baridih, Jamshedpur - 831017 &nbsp;{" "}
          <span className="ml-2 font-bold">Reg No: 755/160</span>
        </p>
        <p>
          Website:{" "}
          <span className="text-blue-600 font-bold">https://relf.in/</span>
        </p>
      </div>
    </div>
  );
}
