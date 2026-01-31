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

type VoucherItem = {
  description: string;
  amount: number;
};

type VoucherData = {
  voucherNo: string;
  paymentDate: string | Date;
  projectName?: string;
  expenditureHead?: string;
  payeeName: string;
  payeeMobile?: string;
  items: VoucherItem[];
  paymentMode?: string;
  totalAmount?: number;
  amountInWords?: string;
  approvedByName?: string;
  approvedByDesignation?: string;
};

type Props = {
  data: VoucherData;
  logoSrc?: string;
};

const defaultLogo = "/certificates/assets/logo.png";
const defaultSignature = "/certificates/assets/sign_left.png";

const formatDate = (date: string | Date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function PaymentVoucherCard({
  data,
  logoSrc = defaultLogo,
}: Props) {
  if (!data) return null;

  const items = Array.isArray(data.items) ? data.items : [];

  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  const amountWords = toWords.convert(totalAmount);

  const minRows = 6;
  const fillerRows = Math.max(0, minRows - items.length);

  return (
    <div className="w-full flex justify-center bg-white py-10 min-h-screen">
      <div
        id="voucher-root"
        className="bg-white text-slate-800 font-sans relative flex flex-col justify-start"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "15mm",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <Image src={logoSrc} width={400} height={400} alt="watermark" /> 
        </div>

        <header className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
          <div className="flex gap-5 items-center">
            <div className="relative w-20 h-20">
              <Image
                src={logoSrc}
                alt="Relearn Foundation Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight uppercase">
                Relearn Foundation
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1 leading-tight">
                2681 Vijaya Gardens Baridih,
                <br /> Jamshedpur, 831017
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Reg No: 755/160
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-light text-slate-300 uppercase tracking-widest">
              Voucher
            </h2>
            <div className="mt-2 text-sm font-bold text-slate-700">
              #{data.voucherNo}
            </div>
            <div className="text-sm text-slate-500">
              {formatDate(data.paymentDate)}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10 text-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">
                Project / Event
              </label>
              <div className="font-semibold text-slate-800 border-b border-slate-200 pb-1">
                {data.projectName || "General Fund"}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">
                Expenditure Head
              </label>
              <div className="font-semibold text-slate-800 border-b border-slate-200 pb-1">
                {data.expenditureHead || "N/A"}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">
                Paid To
              </label>
              <div className="font-semibold text-slate-800 text-lg border-b border-slate-200 pb-1">
                {data.payeeName}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">
                Payment Mode
              </label>
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {data.paymentMode || "Online Transfer"}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grow">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-900 border-y border-slate-300">
                <th className="py-3 pl-4 text-left font-bold w-16">No.</th>
                <th className="py-3 text-left font-bold">Description</th>
                <th className="py-3 pr-4 text-right font-bold w-32">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50/50"
                >
                  <td className="py-3 pl-4 text-slate-400">
                    {String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="py-3 font-medium">{item.description}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-slate-900">
                    {item.amount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
              {/* Filler Rows */}
              {[...Array(fillerRows)].map((_, i) => (
                <tr
                  key={`fill-${i}`}
                  className="border-b border-slate-100 h-12"
                >
                  <td className="py-3 pl-4"></td>
                  <td className="py-3"></td>
                  <td className="py-3 pr-4"></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white">
                <td
                  colSpan={2}
                  className="py-3 pl-4 text-right font-medium uppercase tracking-wide text-xs"
                >
                  Total Amount
                </td>
                <td className="py-3 pr-4 text-right font-bold text-lg">
                  {totalAmount.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                  })}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words */}
          <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-md">
            <span className="text-xs uppercase text-slate-400 font-bold mr-2">
              In Words:
            </span>
            <span className="font-serif italic text-slate-700 capitalize">
              {amountWords} Only
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-auto pt-10">
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[200px] border-t border-slate-400 pt-3 text-center">
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-50 h-20">
                <Image
                  src={defaultSignature}
                  alt="Signature"
                  fill
                  className="object-contain object-bottom"
                />
              </div>

              <p className="font-bold text-slate-900 text-sm">
                Dr Mita Tarafder
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">
                Chief, Relearn Foundation
              </p>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">
                Authorized Signatory
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-full max-w-[200px] border-t border-slate-400 pt-3 text-center">
              <p className="font-bold text-slate-900 text-sm">
                {data.payeeName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.payeeMobile}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">
                Receiver&apos;s Signature
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
