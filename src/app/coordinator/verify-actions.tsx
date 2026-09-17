"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyActions({
  endpoint,
  currentStatus,
}: {
  endpoint: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"VERIFIED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "VERIFIED" | "REJECTED") {
    setError(null);
    setLoading(status);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
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
          disabled={loading !== null || currentStatus === "VERIFIED"}
          onClick={() => act("VERIFIED")}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {loading === "VERIFIED" ? "Verifying..." : "Verify"}
        </button>
        <button
          type="button"
          disabled={loading !== null || currentStatus === "REJECTED"}
          onClick={() => act("REJECTED")}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-40"
        >
          {loading === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
