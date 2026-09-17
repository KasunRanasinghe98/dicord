import Link from "next/link";
import { db } from "@/server/db";
import { EMPLOYER_TYPE_LABELS } from "@/lib/constants";
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

export default async function CoordinatorEmployersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUS_FILTERS.includes(status as VerificationStatus | "ALL")
    ? (status as VerificationStatus | "ALL" | undefined)
    : "ALL";

  const employers = await db.employerProfile.findMany({
    where: filter && filter !== "ALL" ? { verificationStatus: filter } : {},
    include: {
      user: { select: { phone: true } },
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Employers</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/coordinator/employers" : `/coordinator/employers?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {employers.length === 0 && (
          <p className="text-sm text-neutral-400">No employers match this filter.</p>
        )}
        {employers.map((e) => (
          <div key={e.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{e.businessName}</h3>
                <p className="text-xs text-neutral-500">
                  {e.contactPerson} · {e.user.phone}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                {e.verificationStatus}
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-600">
              {EMPLOYER_TYPE_LABELS[e.employerType]} · {e.location || "No location set"} ·{" "}
              {e._count.jobs} job{e._count.jobs === 1 ? "" : "s"} posted
            </p>
            <div className="mt-3">
              <VerifyActions
                endpoint={`/api/coordinator/employers/${e.id}/verify`}
                currentStatus={e.verificationStatus}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
