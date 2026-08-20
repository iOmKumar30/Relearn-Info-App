"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PAYMENT_TOKEN_KEY = "intern-registration-payment-token";
const RECEIPT_TOKEN_KEY = "intern-registration-receipt-token";

type PaymentStatusResponse = {
  status?: "PENDING" | "PROCESSING" | "PAID";
  amount?: number;
  receiptToken?: string;
  error?: string;
};

function currency(value: number | null) {
  return value === null ? "" : `₹${value.toLocaleString("en-IN")}`;
}

export default function InternPaymentActivation() {
  const router = useRouter();
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const completePayment = useCallback(
    (receiptToken: string) => {
      sessionStorage.setItem(RECEIPT_TOKEN_KEY, receiptToken);
      sessionStorage.removeItem(PAYMENT_TOKEN_KEY);
      router.replace("/intern-registration/receipt");
    },
    [router],
  );

  const checkPaymentStatus = useCallback(
    async (token: string): Promise<boolean> => {
      const response = await fetch("/api/public/intern-registration/payment/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentToken: token }),
      });
      const data = (await response.json().catch(() => ({}))) as PaymentStatusResponse;
      if (!response.ok) throw new Error(data.error || "Unable to check your payment status.");

      if (typeof data.amount === "number") setAmount(data.amount);
      if (data.status === "PAID" && data.receiptToken) {
        completePayment(data.receiptToken);
        return true;
      }
      return false;
    },
    [completePayment],
  );

  useEffect(() => {
    const token = sessionStorage.getItem(PAYMENT_TOKEN_KEY);
    if (!token) {
      setError("This activation session is unavailable. Please contact Relearn Foundation for payment assistance.");
      return;
    }
    setPaymentToken(token);
    checkPaymentStatus(token).catch((statusError) => {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to load payment details.",
      );
    });
  }, [checkPaymentStatus]);

  const waitForCapture = useCallback(
    async (token: string) => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2_500));
        if (await checkPaymentStatus(token)) return;
      }
      setMessage(
        "Your payment is being confirmed. Please keep your payment reference and contact Relearn Foundation if this page does not update shortly.",
      );
    },
    [checkPaymentStatus],
  );

  const verifyPayment = useCallback(
    async (response: Record<string, string>) => {
      if (!paymentToken) return;
      setWorking(true);
      setError("");
      setMessage("Verifying your payment securely…");
      try {
        const verification = await fetch("/api/public/intern-registration/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentToken, ...response }),
        });
        const data = (await verification.json().catch(() => ({}))) as PaymentStatusResponse;
        if (!verification.ok) {
          throw new Error(data.error || "Unable to verify your payment.");
        }
        if (data.status === "PAID" && data.receiptToken) {
          completePayment(data.receiptToken);
          return;
        }
        await waitForCapture(paymentToken);
      } catch (verificationError) {
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Unable to verify your payment. Please contact Relearn Foundation if you were charged.",
        );
      } finally {
        setWorking(false);
      }
    },
    [completePayment, paymentToken, waitForCapture],
  );

  const startPayment = async () => {
    if (!paymentToken || !window.Razorpay) {
      setError("The secure payment service is not ready. Please try again.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/public/intern-registration/payment/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to start the payment.");

      if (data.status === "PAID") {
        await checkPaymentStatus(paymentToken);
        return;
      }
      if (data.status === "PROCESSING") {
        setMessage("Your earlier payment is being confirmed…");
        await waitForCapture(paymentToken);
        return;
      }
      if (!data.orderId || !data.keyId || !data.amount || !data.currency) {
        throw new Error("Unable to start the payment.");
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Relearn Foundation",
        description: "Internship activation fee",
        order_id: data.orderId,
        prefill: data.prefill,
        theme: { color: "#1d4ed8" },
        handler: verifyPayment,
        modal: {
          ondismiss: () => setWorking(false),
        },
      });
      checkout.open();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Unable to start the payment. Please try again later.",
      );
      setWorking(false);
    }
  };

  const skipPayment = () => {
    sessionStorage.removeItem(PAYMENT_TOKEN_KEY);
    router.push("/intern-registration/thank-you");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setCheckoutReady(true)}
        onError={() => setError("The secure payment service could not be loaded. Please try again later.")}
      />
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
        <Image
          src="/assets/relearn_header.png"
          alt="Relearn Foundation"
          width={220}
          height={72}
          className="h-auto w-[190px] object-contain"
          priority
        />
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
          Internship registration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Activate your internship
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Complete the internship activation payment securely through Razorpay. UPI, cards, net banking and other methods available in your Razorpay checkout are supported.
        </p>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-sm text-blue-800">Internship activation fee</p>
          <p className="mt-1 text-3xl font-bold text-blue-950">
            {amount === null ? "Loading…" : currency(amount)}
          </p>
        </div>

        {message && (
          <p role="status" className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!paymentToken || !checkoutReady || working || amount === null}
            onClick={startPayment}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {working ? "Processing…" : "Pay securely"}
          </button>
          <button
            type="button"
            disabled={working}
            onClick={skipPayment}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed"
          >
            Pay later / Skip
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          If you choose to pay later, please contact Relearn Foundation. An administrator can record an offline payment for you.
        </p>
      </section>
    </main>
  );
}
