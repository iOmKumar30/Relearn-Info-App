"use client";

import Image from "next/image";
import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      name: "Rupee",
      plural: "Rupees",
      symbol: "₹",
      fractionalUnit: {
        name: "Paise",
        plural: "Paise",
        symbol: "",
      },
    },
  },
});

type Item = {
  description: string;
  sac: string;
  amount: number;
  discount: number;
  taxableValue: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
};

type ReceiptData = {
  invoiceNo: string;
  invoiceDate: string | Date;
  reverseCharge: string;
  dateOfSupply: string;
  placeOfSupply: string;
  billToName: string;
  billToGstin: string;
  billToState: string;
  billToCode: string;
  shipToName?: string;
  shipToGstin?: string;
  shipToState?: string;
  shipToCode?: string;
  items: Item[];
  // Pre-calculated totals (optional, can recalc)
  totalAmount?: number;
  totalTax?: number;
  grandTotal?: number;
  amountInWords?: string;
};

type Props = {
  data: ReceiptData;
  logoSrc?: string;
};

const defaultLogo = "/certificates/assets/logo.png";

const formatDate = (date: string | Date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
};

export default function GstReceiptCard({ data, logoSrc = defaultLogo }: Props) {
  if (!data) return null;

  const items = Array.isArray(data.items) ? data.items : [];

  // --- RE-CALCULATE TOTALS FOR SAFETY ---
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const totalTaxable = items.reduce(
    (sum, item) => sum + (Number(item.taxableValue) || 0),
    0
  );

  const totalCGST = items.reduce(
    (sum, item) =>
      sum + (Number(item.taxableValue) * Number(item.cgstRate)) / 100,
    0
  );

  const totalSGST = items.reduce(
    (sum, item) =>
      sum + (Number(item.taxableValue) * Number(item.sgstRate)) / 100,
    0
  );

  const totalIGST = items.reduce(
    (sum, item) =>
      sum + (Number(item.taxableValue) * Number(item.igstRate)) / 100,
    0
  );

  const totalTax = totalCGST + totalSGST + totalIGST;
  const grandTotal = totalTaxable + totalTax;

  // Convert to words (Upper case as per image)
  const amountWords = toWords.convert(grandTotal).toUpperCase();

  return (
    <div
      id="receipt-root"
      className="bg-white text-black mx-auto font-sans relative flex flex-col justify-between leading-snug"
      style={{
        width: "210mm", // A4 Width
        minHeight: "297mm", // A4 Height
        padding: "15mm 15mm 15mm 15mm",
        fontSize: "11px",
      }}
    >
      <div>
        {/* --- HEADER --- */}
        <div className="flex gap-4 mb-4">
          <div className="w-24 shrink-0 relative h-24 flex items-start">
            {/* Logo Placeholder - Ensure width/height ratio matches */}
            <div className="relative w-full aspect-square">
              <Image
                src={logoSrc}
                alt="Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-xl text-gray-800 mb-1">
              Relearn Foundation
            </h1>
            <div className="text-gray-600 text-[11px] space-y-1px">
              <p>2681, Vijaya Gardens, Baridih, Jamshedpur, Jharkhand 831017</p>
              <p>PAN No: AACTR5805Q</p>
              <p>80G Registration Number: AACTR5805Q23PT02 dated 22-05-2024</p>
              <p>12A Registration Number: AACTR5805Q23PT01 dated 22-05-2024</p>
              <p>GST No: 20AACTR5805Q2Z9</p>
              <p>CSR-1: CSR00012310 (MINISTRY OF CORPORATE AFFAIRS)</p>
            </div>
          </div>
        </div>

        <div className="text-center font-bold text-xs uppercase mb-2 tracking-widest">
          ORIGINAL
        </div>

        {/* --- BILL TITLE --- */}
        <div className="bg-[#B4C6E7] border-t-2 border-b-2 border-black text-center font-extrabold text-xl py-1 mb-1 shadow-sm">
          BILL OF SUPPLY
        </div>

        {/* --- INVOICE DETAILS GRID --- */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 mb-2 text-[11px]">
          {/* Left Column */}
          <div className="space-y-1">
            <div className="flex">
              <span className="font-bold w-24">Invoice No:</span>
              <span>{data.invoiceNo}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24">Invoice date:</span>
              <span>{formatDate(data.invoiceDate)}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-36">Reverse Charge (Y/N):</span>
              <span>{data.reverseCharge || "N"}</span>
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-1">
            <div className="flex">
              <span className="font-bold w-28">Date of Supply:</span>
              <span>{data.dateOfSupply}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28">Place of Supply:</span>
              <span>{data.placeOfSupply}</span>
            </div>
          </div>
        </div>

        {/* --- STATE ROW --- */}
        <div className="border border-black flex mb-0.5 text-[11px]">
          <div className="flex-1 p-1 border-r border-black font-bold">
            State: Jharkhand
          </div>
          <div className="w-24 p-1 border-r border-black font-bold">Code</div>
          <div className="w-16 p-1 text-center">20</div>
        </div>

        {/* --- BILL TO / SHIP TO SECTION --- */}
        <div className="border border-black border-t-0 mb-4 text-[11px]">
          {/* Headers */}
          <div className="grid grid-cols-2 text-center font-bold bg-[#B4C6E7] border-b border-black">
            <div className="p-1 border-r border-black">Bill to Party</div>
            <div className="p-1">Ship to Party</div>
          </div>

          {/* Content */}
          <div className="grid grid-cols-2">
            {/* Bill To */}
            <div className="border-r border-black flex flex-col">
              <div className="p-1 font-bold border-b border-black min-h-6 bg-gray-50/50">
                {data.billToName}
              </div>
              <div className="p-1 border-b border-black">
                <span className="font-bold">GSTIN:</span> {data.billToGstin}
              </div>
              <div className="flex">
                <div className="flex-1 p-1 border-r border-black">
                  <span className="font-bold">State:</span> {data.billToState}
                </div>
                <div className="w-12 p-1 border-r border-black text-center font-bold">
                  Code
                </div>
                <div className="w-10 p-1 text-center">{data.billToCode}</div>
              </div>
            </div>

            {/* Ship To */}
            <div className="flex flex-col">
              <div className="p-1 font-bold border-b border-black min-h-6 bg-gray-100">
                {data.shipToName || data.billToName}
              </div>
              <div className="p-1 border-b border-black">
                <span className="font-bold">GSTIN:</span>{" "}
                {data.shipToGstin || data.billToGstin}
              </div>
              <div className="flex">
                <div className="flex-1 p-1 border-r border-black">
                  <span className="font-bold">State:</span>{" "}
                  {data.shipToState || data.billToState}
                </div>
                <div className="w-12 p-1 border-r border-black text-center font-bold">
                  Code
                </div>
                <div className="w-10 p-1 text-center">
                  {data.shipToCode || data.billToCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ITEMS TABLE --- */}
        <table className="w-full border-collapse border border-black text-center text-[10px] mb-0">
          <thead className="bg-[#B4C6E7] font-bold">
            <tr>
              <th rowSpan={2} className="border border-black p-1 w-8">
                S.No.
              </th>
              <th rowSpan={2} className="border border-black p-1">
                Product Description
              </th>
              <th rowSpan={2} className="border border-black p-1 w-14">
                SAC
              </th>
              <th rowSpan={2} className="border border-black p-1 w-16">
                Amount
              </th>
              <th rowSpan={2} className="border border-black p-1 w-12">
                Discount
              </th>
              <th rowSpan={2} className="border border-black p-1 w-16">
                Taxable Value
              </th>
              <th colSpan={2} className="border border-black p-1">
                CGST
              </th>
              <th colSpan={2} className="border border-black p-1">
                SGST
              </th>
              <th colSpan={2} className="border border-black p-1">
                IGST
              </th>
              <th rowSpan={2} className="border border-black p-1 w-20">
                Total
              </th>
            </tr>
            <tr className="text-[9px]">
              <th className="border border-black p-0.5 w-8">Rate</th>
              <th className="border border-black p-0.5 w-12">Amount</th>
              <th className="border border-black p-0.5 w-8">Rate</th>
              <th className="border border-black p-0.5 w-12">Amount</th>
              <th className="border border-black p-0.5 w-8">Rate</th>
              <th className="border border-black p-0.5 w-12">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const cgstAmt =
                (Number(item.taxableValue) * Number(item.cgstRate)) / 100;
              const sgstAmt =
                (Number(item.taxableValue) * Number(item.sgstRate)) / 100;
              const igstAmt =
                (Number(item.taxableValue) * Number(item.igstRate)) / 100;
              const rowTotal =
                Number(item.taxableValue) + cgstAmt + sgstAmt + igstAmt;

              return (
                <tr key={idx} className="align-top h-8">
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1 text-left">
                    {item.description}
                  </td>
                  <td className="border border-black p-1">{item.sac}</td>
                  <td className="border border-black p-1">
                    {Number(item.amount).toFixed(2)}
                  </td>
                  <td className="border border-black p-1">
                    {Number(item.discount).toFixed(2)}
                  </td>
                  <td className="border border-black p-1 font-medium">
                    {Number(item.taxableValue).toFixed(2)}
                  </td>
                  <td className="border border-black p-1">{item.cgstRate}%</td>
                  <td className="border border-black p-1">
                    {cgstAmt.toFixed(2)}
                  </td>
                  <td className="border border-black p-1">{item.sgstRate}%</td>
                  <td className="border border-black p-1">
                    {sgstAmt.toFixed(2)}
                  </td>
                  <td className="border border-black p-1">{item.igstRate}%</td>
                  <td className="border border-black p-1">
                    {igstAmt.toFixed(2)}
                  </td>
                  <td className="border border-black p-1 font-bold">
                    {rowTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}

            {/* Filler rows to ensure minimum height for table body */}
            {[...Array(Math.max(0, 3 - items.length))].map((_, i) => (
              <tr key={`fill-${i}`}>
                <td className="border border-black p-1 h-8">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
                <td className="border border-black p-1">&nbsp;</td>
              </tr>
            ))}

            {/* TOTAL ROW */}
            <tr className="bg-[#B4C6E7] font-bold text-[11px]">
              <td
                colSpan={3}
                className="border border-black p-1 text-left pl-4 text-lg font-serif"
              >
                Total
              </td>
              <td className="border border-black p-1">
                {totalAmount.toFixed(2)}
              </td>
              <td className="border border-black p-1">-</td>
              <td className="border border-black p-1">
                {totalTaxable.toFixed(2)}
              </td>
              <td className="border border-black p-1 bg-gray-300"></td>
              <td className="border border-black p-1">
                {totalCGST.toFixed(2)}
              </td>
              <td className="border border-black p-1 bg-gray-300"></td>
              <td className="border border-black p-1">
                {totalSGST.toFixed(2)}
              </td>
              <td className="border border-black p-1 bg-gray-300"></td>
              <td className="border border-black p-1">
                {totalIGST.toFixed(2)}
              </td>
              <td className="border border-black p-1">
                {grandTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* --- FOOTER SECTIONS --- */}
        <div className="flex border border-black border-t-0 text-[11px]">
          {/* LEFT SIDE: Words */}
          <div className="flex-1 border-r border-black p-4 flex flex-col justify-center items-center text-center font-bold">
            <span className="uppercase">{amountWords} ONLY</span>
          </div>

          {/* RIGHT SIDE: Tax Summary */}
          <div className="w-[350px]">
            <div className="flex justify-between border-b border-black p-1 px-2">
              <span>Total Amount before Tax</span>
              <span>{totalTaxable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-1 px-2">
              <span>Add: CGST</span>
              <span>{totalCGST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-1 px-2">
              <span>Add: SGST</span>
              <span>{totalSGST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-1 px-2">
              <span>Add: IGST</span>
              <span>{totalIGST.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-1 px-2 font-bold bg-gray-50">
              <span>Total Tax Amount</span>
              <span>{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-black p-1 px-2 font-bold bg-[#B4C6E7]">
              <span>Total Amount after Tax:</span>
              <span>{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-1 px-2 bg-[#B4C6E7]">
              <span>GST on Reverse Charge</span>
              <span>
                {data.reverseCharge === "Y" ? totalTax.toFixed(2) : "0"}
              </span>
            </div>
          </div>
        </div>

        {/* --- BANK & SIGNATORY ROW --- */}
        <div className="flex border border-black border-t-0 text-[11px]">
          {/* Bank Details */}
          <div className="flex-1 border-r border-black">
            <div className="border-b border-black p-1 px-2 bg-[#B4C6E7] font-bold">
              Bank A/C:{" "}
              <span className="ml-2 font-normal text-black">34718081723</span>
            </div>
            <div className="border-b border-black p-1 px-2 bg-[#B4C6E7] font-bold">
              Bank Name:{" "}
              <span className="ml-2 font-normal text-black">
                State Bank Of India, NML Branch
              </span>
            </div>
            <div className="p-1 px-2 bg-[#B4C6E7] font-bold">
              Bank IFSC:{" "}
              <span className="ml-2 font-normal text-black">SBIN0003329</span>
            </div>
          </div>

          {/* Signatory */}
          <div className="w-[350px] flex flex-col justify-between p-2 text-center">
            <p className="text-[10px]">
              Certified that the particulars given above are true and correct
            </p>
            <p className="font-bold">Relearn Foundation</p>
            <div className="mt-8 pt-4">
              <span className="font-bold border-t border-black px-4 py-1">
                Authorised signatory
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- PAGE FOOTER (CONTACT INFO) --- */}
      <div className="absolute bottom-8 left-0 right-0 px-12 text-center text-gray-500 text-[10px]">
        {/* Top Line with separators */}
        <div className="flex justify-center items-center gap-4 mb-1">
          <div className="h-px bg-gray-300 flex-1"></div>
          <div className="whitespace-nowrap font-semibold text-gray-600 flex gap-4">
            <span>relearn2015@gmail.com</span>
            <span>+91-9334041104</span>
          </div>
          <div className="h-px bg-gray-300 flex-1"></div>
        </div>

        {/* Address Line */}
        <div className="text-gray-600">
          2681 Vijaya Garden, Baridih, Jamshedpur-831017
          &nbsp;&nbsp;|&nbsp;&nbsp; Reg No: 755/160
        </div>

        {/* Website Line */}
        <div className="font-bold text-gray-600 mt-0.5">
          Website: <span className="text-blue-600">https://relf.in/</span>
        </div>
      </div>
    </div>
  );
}
