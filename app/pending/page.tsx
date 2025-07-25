// app/pending/page.tsx
export default function PendingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gray-900">
      <h1 className="text-3xl font-bold mb-4">⏳ Awaiting Approval</h1>
      <p className="text-lg text-gray-300 max-w-xl text-center">
        Your account is currently under review. Please wait for an admin to
        assign you a role. You will be notified via email once your account is
        approved.
      </p>
    </div>
  );
}
