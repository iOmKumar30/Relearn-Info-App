"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: string | HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

type FormState = {
  name: string;
  email: string;
  mobile: string;
  address: string;
  gender: string;
  dateOfBirth: string;
  institution: string;
  previousInstitute: string;
  ongoingCourse: string;
  educationCompleted: string;
  areasOfInterest: string;
  preferredHoursPerDay: string;
  workingMode: string;
  joiningDate: string;
  associatedAfter: boolean;
};

const initialForm: FormState = {
  name: "",
  email: "",
  mobile: "",
  address: "",
  gender: "",
  dateOfBirth: "",
  institution: "",
  previousInstitute: "",
  ongoingCourse: "",
  educationCompleted: "",
  areasOfInterest: "",
  preferredHoursPerDay: "",
  workingMode: "",
  joiningDate: "",
  associatedAfter: false,
};

function FieldLabel({ htmlFor, children, required = false }: { htmlFor: string; children: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {children} {required && <span className="text-rose-600">*</span>}
    </label>
  );
}

const inputClassName =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function InternRegistrationForm() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderTurnstile = useCallback(() => {
    const turnstile = (window as TurnstileWindow).turnstile;
    if (!turnstile || !turnstileRef.current || widgetIdRef.current) return;

    widgetIdRef.current = turnstile.render(turnstileRef.current, {
      sitekey: process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY!,
      theme: "light",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  }, []);

  useEffect(() => {
    if (turnstileReady) renderTurnstile();
  }, [renderTurnstile, turnstileReady]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    const turnstile = (window as TurnstileWindow).turnstile;
    if (turnstile && widgetIdRef.current) turnstile.reset(widgetIdRef.current);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!turnstileToken) {
      setError("Please complete the verification before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/intern-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cfToken: turnstileToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to submit the registration. Please try again later.");
      }
      if (typeof data?.paymentToken !== "string" || !data.paymentToken) {
        throw new Error("Unable to start your internship activation. Please contact Relearn Foundation.");
      }

      setForm(initialForm);
      setSuccess(true);
      resetTurnstile();
      sessionStorage.setItem("intern-registration-payment-token", data.paymentToken);
      router.replace("/intern-registration/activate");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit the registration. Please try again later.",
      );
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
        onLoad={() => setTurnstileReady(true)}
      />

      <section className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <header className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-7 sm:px-10 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Image
              src="/assets/relearn_header.png"
              alt="Relearn Foundation"
              width={220}
              height={72}
              className="h-auto w-[190px] object-contain sm:w-[220px]"
              priority
            />
            <div className="border-slate-200 sm:border-l sm:pl-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                Relearn Foundation
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Intern Registration
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Share your details to apply for an internship. Our team will review your registration and contact you.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={submit} className="space-y-8 px-5 py-7 sm:px-10 sm:py-10">
          {success && (
            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Your internship registration has been submitted successfully. We will contact you after review.
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </div>
          )}

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-slate-900">Personal information</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div><FieldLabel htmlFor="name" required>Full name</FieldLabel><input id="name" required maxLength={120} value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClassName} autoComplete="name" /></div>
              <div><FieldLabel htmlFor="email" required>Email address</FieldLabel><input id="email" required type="email" maxLength={254} value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClassName} autoComplete="email" /></div>
              <div><FieldLabel htmlFor="mobile" required>Mobile number</FieldLabel><input id="mobile" required inputMode="tel" maxLength={30} value={form.mobile} onChange={(e) => update("mobile", e.target.value)} className={inputClassName} autoComplete="tel" /></div>
              <div><FieldLabel htmlFor="gender">Gender</FieldLabel><select id="gender" value={form.gender} onChange={(e) => update("gender", e.target.value)} className={inputClassName}><option value="">Select an option</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
              <div><FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel><input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputClassName} /></div>
              <div className="md:col-span-2 lg:col-span-3"><FieldLabel htmlFor="address">Address</FieldLabel><textarea id="address" rows={3} maxLength={1000} value={form.address} onChange={(e) => update("address", e.target.value)} className={inputClassName} /></div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-slate-200 pt-8">
            <legend className="text-lg font-semibold text-slate-900">Education and interests</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><FieldLabel htmlFor="institution">Current institute</FieldLabel><input id="institution" maxLength={200} value={form.institution} onChange={(e) => update("institution", e.target.value)} className={inputClassName} /></div>
              <div><FieldLabel htmlFor="previousInstitute">Previous institute</FieldLabel><input id="previousInstitute" maxLength={200} value={form.previousInstitute} onChange={(e) => update("previousInstitute", e.target.value)} className={inputClassName} /></div>
              <div><FieldLabel htmlFor="ongoingCourse">Ongoing course</FieldLabel><input id="ongoingCourse" maxLength={200} value={form.ongoingCourse} onChange={(e) => update("ongoingCourse", e.target.value)} className={inputClassName} /></div>
              <div><FieldLabel htmlFor="educationCompleted">Education completed</FieldLabel><input id="educationCompleted" maxLength={200} value={form.educationCompleted} onChange={(e) => update("educationCompleted", e.target.value)} className={inputClassName} /></div>
              <div className="md:col-span-2"><FieldLabel htmlFor="areasOfInterest">Areas of interest</FieldLabel><textarea id="areasOfInterest" rows={3} maxLength={500} value={form.areasOfInterest} onChange={(e) => update("areasOfInterest", e.target.value)} className={inputClassName} /></div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-slate-200 pt-8">
            <legend className="text-lg font-semibold text-slate-900">Internship preferences</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div><FieldLabel htmlFor="joiningDate">Preferred joining date</FieldLabel><input id="joiningDate" type="date" value={form.joiningDate} onChange={(e) => update("joiningDate", e.target.value)} className={inputClassName} /></div>
              <div><FieldLabel htmlFor="workingMode">Preferred working mode</FieldLabel><select id="workingMode" value={form.workingMode} onChange={(e) => update("workingMode", e.target.value)} className={inputClassName}><option value="">Select an option</option><option value="ONSITE">On-site</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option></select></div>
              <div><FieldLabel htmlFor="preferredHoursPerDay">Preferred hours per day</FieldLabel><input id="preferredHoursPerDay" maxLength={100} placeholder="e.g. 4 hours" value={form.preferredHoursPerDay} onChange={(e) => update("preferredHoursPerDay", e.target.value)} className={inputClassName} /></div>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2 lg:col-span-3">
                <input type="checkbox" checked={form.associatedAfter} onChange={(e) => update("associatedAfter", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                I am interested in future association with Relearn Foundation after the internship.
              </label>
            </div>
          </fieldset>

          <div className="border-t border-slate-200 pt-8">
            <p className="mb-4 text-sm leading-6 text-slate-600">Please complete the verification to protect this form from automated submissions. Your registration does not create an application login account.</p>
            <div ref={turnstileRef} className="mb-5 min-h-[65px]" />
            <button type="submit" disabled={isSubmitting || !turnstileToken} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto">
              {isSubmitting ? "Submitting registration…" : "Submit registration"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
