"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JobApprovalActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setError(null);
    setLoading("approve");
    try {
      const res = await fetch(`/api/coordinator/jobs/${jobId}/approve`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not approve.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function reject() {
    const reason = prompt("Reason for rejecting this job? (optional)") ?? "";
    setError(null);
    setLoading("reject");
    try {
      const res = await fetch(`/api/coordinator/jobs/${jobId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not reject.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={approve}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={reject}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-40"
        >
          {loading === "reject" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
