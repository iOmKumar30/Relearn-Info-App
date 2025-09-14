"use client";

import LogoutButton from "@/components/LogoutButton";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { ClipLoader } from "react-spinners";

type UpdatableProfile = {
  name: string;
  phone?: string | null;
  address?: string | null;
};

export default function PendingPage() {
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<UpdatableProfile>({
    name: "",
    phone: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      signOut({ callbackUrl: "/" }); // Redirects to home
    }
  }, [status]);

  const onboardingStatus = (session?.user as any)?.onboardingStatus as
    | "PENDING_PROFILE"
    | "SUBMITTED_PROFILE"
    | "PENDING_ROLE"
    | "ACTIVE"
    | "REJECTED"
    | undefined;

  const isSubmittedOrBeyond =
    onboardingStatus === "SUBMITTED_PROFILE" ||
    onboardingStatus === "PENDING_ROLE" ||
    onboardingStatus === "ACTIVE";

  const disabled = useMemo(
    () => loading || status === "loading",
    [loading, status]
  );

  const handleChange =
    (key: keyof UpdatableProfile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!form.name?.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/users/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone?.toString().trim() || undefined,
          address: form.address?.toString().trim() || undefined,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to submit profile");
      }

      await update();
      setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, 2000);
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking session
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader size={40} />
      </div>
    );
  }

  if (!session?.user?.id) {
    // Even if session is missing but status isn't updated yet, fallback logout
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-gray-200">
        {" "}
        Please sign in to continue.
      </div>
    );
  }

  // Submitted or beyond → show review message
  if (isSubmittedOrBeyond) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <LogoutButton />
        <h1 className="mb-4 text-3xl font-bold">⏳ Awaiting Approval</h1>
        <p className="max-w-xl text-center text-lg text-gray-300">
          Your account is currently under review. Please wait for an admin to
          assign a role. An email notification will be sent once the account is
          approved.
        </p>
      </div>
    );
  }

  // PENDING_PROFILE → show profile form
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <LogoutButton />
      <div className="w-full max-w-xl rounded-lg border border-gray-800 bg-gray-850/40 p-6 text-white shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold">Complete Profile</h1>
        <p className="mb-6 text-sm text-gray-300">
          Provide the details below and submit for admin review and role
          assignment.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-200">
              Full Name
            </label>
            <input
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-200">
              Phone
            </label>
            <input
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              value={form.phone ?? ""}
              onChange={handleChange("phone")}
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-200">
              Address
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              value={form.address ?? ""}
              onChange={handleChange("address")}
              placeholder="Street, City, State, Pincode"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-md border border-green-700 bg-green-900/40 px-3 py-2 text-sm text-green-200">
              Profile submitted. Awaiting admin approval.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={disabled}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
