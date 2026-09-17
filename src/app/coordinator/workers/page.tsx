import Link from "next/link";
import { db } from "@/server/db";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { VerifyActions } from "../verify-actions";
import type { VerificationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: Array<VerificationStatus | "ALL"> = [
  "ALL",
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

export default async function CoordinatorWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUS_FILTERS.includes(status as VerificationStatus | "ALL")
    ? (status as VerificationStatus | "ALL" | undefined)
    : "ALL";

  const workers = await db.workerProfile.findMany({
    where: filter && filter !== "ALL" ? { verificationStatus: filter } : {},
    include: { user: { select: { phone: true, lastActiveAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Workers</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/coordinator/workers" : `/coordinator/workers?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {workers.length === 0 && (
          <p className="text-sm text-neutral-400">No workers match this filter.</p>
        )}
        {workers.map((w) => (
          <div key={w.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{w.fullName}</h3>
                <p className="text-xs text-neutral-500">
                  {w.user.phone} {w.university ? `· ${w.university}` : ""}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                {w.verificationStatus}
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              {w.location || "No location set"} ·{" "}
              {w.preferredCategories.length > 0
                ? w.preferredCategories.map((c) => JOB_CATEGORY_LABELS[c]).join(", ")
                : "No category preferences"}
            </p>
            <div className="mt-3">
              <VerifyActions
                endpoint={`/api/coordinator/workers/${w.id}/verify`}
                currentStatus={w.verificationStatus}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
