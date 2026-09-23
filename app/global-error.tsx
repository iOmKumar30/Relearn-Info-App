"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("GLOBAL_RENDER_ERROR", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1>Something went wrong</h1>
          <button type="button" onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
