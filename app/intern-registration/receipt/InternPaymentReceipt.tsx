"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const RECEIPT_TOKEN_KEY = "intern-registration-receipt-token";

type Receipt = {
  receiptNumber: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  paidAt: string | null;
  intern: { name: string; email: string | null; mobile: string | null };
};

export default function InternPaymentReceipt() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem(RECEIPT_TOKEN_KEY);
    if (!token) {
      setError("This receipt session is unavailable. Please contact Relearn Foundation for a copy of your receipt.");
      return;
    }

    fetch(`/api/public/intern-registration/payment/receipt?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load the payment receipt.");
        setReceipt(data as Receipt);
      })
      .catch((receiptError) => {
        setError(receiptError instanceof Error ? receiptError.message : "Unable to load the payment receipt.");
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Image src="/assets/relearn_header.png" alt="Relearn Foundation" width={220} height={72} className="h-auto w-[190px] object-contain" priority />
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">Payment successful</span>
        </div>
        {error && <p role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {!receipt && !error && <p className="mt-6 text-sm text-slate-600">Loading your receipt…</p>}
        {receipt && (
          <div id="intern-payment-receipt" className="mt-6 space-y-5 text-sm text-slate-700">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Payment receipt</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Internship activation payment</h1>
            </div>
            <dl className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
              <div><dt className="text-slate-500">Receipt number</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.receiptNumber}</dd></div>
              <div><dt className="text-slate-500">Payment date</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString("en-IN") : "—"}</dd></div>
              <div><dt className="text-slate-500">Intern</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.intern.name}</dd></div>
              <div><dt className="text-slate-500">Amount paid</dt><dd className="mt-1 text-xl font-bold text-slate-900">₹{receipt.amount.toLocaleString("en-IN")}</dd></div>
              {receipt.paymentId && <div className="sm:col-span-2"><dt className="text-slate-500">Razorpay payment reference</dt><dd className="mt-1 break-all font-mono text-xs text-slate-900">{receipt.paymentId}</dd></div>}
            </dl>
            <p className="text-xs leading-5 text-slate-500">This is a payment receipt. A statutory tax invoice requires the organisation’s applicable GST and invoicing details.</p>
            <button type="button" onClick={() => window.print()} className="print:hidden inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200">Print or save receipt</button>
          </div>
        )}
      </section>
    </main>
  );
}
