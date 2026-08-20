import Image from "next/image";
import Link from "next/link";

export default function InternRegistrationThankYouPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60 sm:p-10">
        <Image
          src="/assets/relearn_header.png"
          alt="Relearn Foundation"
          width={220}
          height={72}
          className="mx-auto h-auto w-[190px] object-contain"
          priority
        />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">Thank you for registering</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your internship registration has been received. You may complete payment later through Relearn Foundation, and an administrator can update your payment status after an offline payment.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          Return to home
        </Link>
      </section>
    </main>
  );
}
