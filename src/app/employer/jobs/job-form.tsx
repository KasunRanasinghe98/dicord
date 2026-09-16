"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobCategory } from "@prisma/client";
import { ALL_JOB_CATEGORIES, JOB_CATEGORY_LABELS } from "@/lib/constants";

export interface JobFormValues {
  title: string;
  category: JobCategory | "";
  description: string;
  workersRequired: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  payPerWorker: string;
  mealsProvided: boolean;
  transportProvided: boolean;
  requiredSkills: string;
  applicationDeadline: string;
}

const EMPTY: JobFormValues = {
  title: "",
  category: "",
  description: "",
  workersRequired: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  payPerWorker: "",
  mealsProvided: false,
  transportProvided: false,
  requiredSkills: "",
  applicationDeadline: "",
};

export function JobForm({
  jobId,
  initial,
}: {
  jobId?: string;
  initial?: JobFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isValid =
    values.title.trim().length > 0 &&
    values.category !== "" &&
    values.description.trim().length > 0 &&
    Number(values.workersRequired) >= 1 &&
    values.date !== "" &&
    values.startTime !== "" &&
    values.endTime !== "" &&
    values.location.trim().length > 0 &&
    Number(values.payPerWorker) > 0;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(jobId ? `/api/employer/jobs/${jobId}` : "/api/employer/jobs", {
        method: jobId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save job.");
      router.push("/employer");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Job title">
        <input
          type="text"
          placeholder="e.g. Event Helper - Wedding Fair"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Category">
        <select
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as JobCategory }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select one
          </option>
          {ALL_JOB_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {JOB_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description">
        <textarea
          rows={3}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Workers required">
          <input
            type="number"
            min={1}
            value={values.workersRequired}
            onChange={(e) => setValues((v) => ({ ...v, workersRequired: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Pay per worker (Rs.)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={values.payPerWorker}
            onChange={(e) => setValues((v) => ({ ...v, payPerWorker: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Date">
        <input
          type="date"
          value={values.date}
          onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time">
          <input
            type="time"
            value={values.startTime}
            onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="End time">
          <input
            type="time"
            value={values.endTime}
            onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <Field label="Location">
        <input
          type="text"
          placeholder="e.g. Colombo"
          value={values.location}
          onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Application deadline (optional)">
        <input
          type="date"
          value={values.applicationDeadline}
          onChange={(e) => setValues((v) => ({ ...v, applicationDeadline: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Required skills (optional)" hint="Comma-separated, e.g. forklift, cash handling">
        <input
          type="text"
          value={values.requiredSkills}
          onChange={(e) => setValues((v) => ({ ...v, requiredSkills: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.mealsProvided}
            onChange={(e) => setValues((v) => ({ ...v, mealsProvided: e.target.checked }))}
          />
          Meals provided
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.transportProvided}
            onChange={(e) => setValues((v) => ({ ...v, transportProvided: e.target.checked }))}
          />
          Transport provided
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={saving || !isValid}
        onClick={save}
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : jobId ? "Save changes" : "Save as draft"}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
