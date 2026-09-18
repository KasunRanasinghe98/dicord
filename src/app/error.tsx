"use client";

// App Router convention: catches any unhandled error thrown while
// rendering a page and shows this instead of a raw stack trace. Server
// Components already log the real error to the server console (Next does
// this automatically); this boundary only controls what the user sees.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-neutral-500">
        This wasn&apos;t your fault. Try again, and if it keeps happening, let
        the coordinator know.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </main>
  );
}
