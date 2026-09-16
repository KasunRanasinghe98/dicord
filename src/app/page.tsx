import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Digital Coordinator
        </h1>
        <p className="text-base text-neutral-600">
          Post a staffing requirement, get matched with available workers, and
          track confirmation, attendance and replacements from one place —
          no more WhatsApp groups.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login?role=WORKER"
          className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white"
        >
          I&apos;m looking for work
        </Link>
        <Link
          href="/login?role=EMPLOYER"
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900"
        >
          I need workers
        </Link>
      </div>
    </main>
  );
}
