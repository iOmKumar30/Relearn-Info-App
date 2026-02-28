"use client";
import { Button } from "flowbite-react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold text-gray-800">
        Something went wrong!
      </h2>
      <p className="text-gray-500 mb-4">{error.message}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
