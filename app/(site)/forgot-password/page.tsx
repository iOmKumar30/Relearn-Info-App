"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSending(true);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(await response.text());
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request a reset link");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white px-6 py-8 shadow sm:px-10">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">← Back to sign in</Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Enter your email address and we’ll send a one-time reset link if a password sign-in account exists.</p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            If an eligible account exists for that email address, a password-reset link has been sent. Check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            </div>
            <button type="submit" disabled={sending} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              {sending ? "Sending reset link…" : "Send reset link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
