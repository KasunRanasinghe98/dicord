"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VARIANT_STYLES: Record<string, string> = {
  default: "border border-neutral-300 text-neutral-700",
  primary: "bg-neutral-900 text-white",
  danger: "border border-red-300 text-red-700",
};

// Shared by the coordinator job detail page and the worker dashboard —
// every simple fire-a-POST-then-refresh action (select, withdraw, offer,
// cancel, start, complete, mark attendance, confirm, decline) has the same
// shape: hit an endpoint, show the error inline if it fails, refresh the
// page if it succeeds.
export function ActionButton({
  endpoint,
  label,
  pendingLabel,
  body,
  variant = "default",
  confirmMessage,
}: {
  endpoint: string;
  label: string;
  pendingLabel?: string;
  body?: unknown;
  variant?: "default" | "primary" | "danger";
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={run}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${VARIANT_STYLES[variant]}`}
      >
        {loading ? (pendingLabel ?? "Working...") : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </span>
  );
}
