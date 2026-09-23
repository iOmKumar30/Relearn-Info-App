"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("APP_RENDER_ERROR", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-gray-600">
        The page could not be loaded. Your data has not been changed.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
