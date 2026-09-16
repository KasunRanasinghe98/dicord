"use client";

import { useState } from "react";
import type { JobCategory } from "@prisma/client";
import type { WorkerJobListing } from "@/server/jobs/queries";
import { JOB_CATEGORY_LABELS, WORKER_SELECTABLE_CATEGORIES } from "@/lib/constants";

function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function formatDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function JobsBrowser({ initialJobs }: { initialJobs: WorkerJobListing[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [category, setCategory] = useState<JobCategory | "">("");
  const [loading, setLoading] = useState(false);

  async function applyFilter(nextCategory: JobCategory | "") {
    setCategory(nextCategory);
    setLoading(true);
    try {
      const qs = nextCategory ? `?category=${nextCategory}` : "";
      const res = await fetch(`/api/jobs${qs}`);
      const body = await res.json();
      setJobs(body.jobs);
    } finally {
      setLoading(false);
    }
  }

  async function apply(jobId: string) {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, applicationStatus: "APPLIED" } : j)),
    );
    const res = await fetch(`/api/jobs/${jobId}/apply`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, applicationStatus: null } : j)),
      );
      alert(body.error ?? "Could not apply.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyFilter("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            category === "" ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
          }`}
        >
          All
        </button>
        {WORKER_SELECTABLE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => applyFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              category === c ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
            }`}
          >
            {JOB_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-neutral-400">Loading...</p>}

      {!loading && jobs.length === 0 && (
        <p className="text-sm text-neutral-400">No open jobs right now. Check back soon.</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{job.title}</h3>
                <p className="text-xs text-neutral-500">{job.employerName}</p>
              </div>
              {job.isPreferredCategory && (
                <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Matches your preferences
                </span>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-600">
              <div>{formatDate(job.date)}</div>
              <div>{formatTime(job.startTime)} - {formatTime(job.endTime)}</div>
              <div>{job.location}</div>
              <div>Rs. {job.payPerWorker} / worker</div>
              <div>{job.confirmedCount} / {job.workersRequired} confirmed</div>
              <div>
                {job.mealsProvided ? "Meals" : ""}
                {job.mealsProvided && job.transportProvided ? " · " : ""}
                {job.transportProvided ? "Transport" : ""}
              </div>
            </dl>

            <div className="mt-3">
              {job.applicationStatus ? (
                <span className="inline-block rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600">
                  {job.applicationStatus === "APPLIED" ? "Applied — awaiting response" : job.applicationStatus}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => apply(job.id)}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
