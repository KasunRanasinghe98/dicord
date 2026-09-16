"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { JobStatus } from "@prisma/client";

export function JobActions({ jobId, status }: { jobId: string; status: JobStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"submit" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "submit" | "cancel") {
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/employer/jobs/${jobId}/${action}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  const canCancel = status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <>
            <Link
              href={`/employer/jobs/${jobId}/edit`}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700"
            >
              Edit
            </Link>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => act("submit")}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {loading === "submit" ? "Submitting..." : "Submit for approval"}
            </button>
          </>
        )}
        {canCancel && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => {
              if (confirm("Cancel this job? This can't be undone.")) act("cancel");
            }}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
          >
            {loading === "cancel" ? "Cancelling..." : "Cancel job"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
