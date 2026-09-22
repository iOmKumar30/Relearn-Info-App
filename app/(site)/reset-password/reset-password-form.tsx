"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const secret = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    // The secret has been captured in memory; remove it from browser history.
    window.history.replaceState(null, "", "/reset-password");
    setToken(secret);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password and confirmation do not match");
      return;
    }

    try {
      setResetting(true);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) throw new Error(await response.text());
      setComplete(true);
      toast.success("Password reset successfully");
      window.setTimeout(() => router.replace("/"), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password");
    } finally {
      setResetting(false);
    }
  }

  if (token === null) {
    return <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow">Loading reset form…</div>;
  }

  if (!token) {
    return (
      <section className="mx-auto w-full max-w-md rounded-2xl bg-white px-6 py-8 shadow sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invalid reset link</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">This link is incomplete. Request a new password-reset link to continue.</p>
        <Link href="/forgot-password" className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">Request a new link</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl bg-white px-6 py-8 shadow sm:px-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">This one-time link expires 15 minutes after it was requested.</p>

      {complete ? (
        <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">Password reset. You are being returned to sign in.</div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
          </div>
          <button type="submit" disabled={resetting} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {resetting ? "Resetting password…" : "Reset password"}
          </button>
        </form>
      )}
    </section>
  );
}
