import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-neutral-500">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        Go home
      </Link>
    </main>
  );
}
