"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobCategory } from "@prisma/client";
import { JOB_CATEGORY_LABELS, WORKER_SELECTABLE_CATEGORIES, DAY_LABELS } from "@/lib/constants";

export interface ProfileFormValues {
  nic: string;
  fullName: string;
  university: string;
  location: string;
  preferredAreas: string;
  preferredCategories: JobCategory[];
  skills: string;
  languages: string;
  transportAvailable: boolean;
  availableDays: number[];
}

const EMPTY: ProfileFormValues = {
  nic: "",
  fullName: "",
  university: "",
  location: "",
  preferredAreas: "",
  preferredCategories: [],
  skills: "",
  languages: "",
  transportAvailable: false,
  availableDays: [],
};

export function ProfileForm({ initial }: { initial: ProfileFormValues | null }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleCategory(category: JobCategory) {
    setValues((v) => ({
      ...v,
      preferredCategories: v.preferredCategories.includes(category)
        ? v.preferredCategories.filter((c) => c !== category)
        : [...v.preferredCategories, category],
    }));
  }

  function toggleDay(day: number) {
    setValues((v) => ({
      ...v,
      availableDays: v.availableDays.includes(day)
        ? v.availableDays.filter((d) => d !== day)
        : [...v.availableDays, day],
    }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/worker/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save profile.");
      router.push("/worker");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field
        label="NIC number"
        hint="Used to confirm you're a real, unique person — e.g. 912345678V or 199212345678"
      >
        <input
          type="text"
          value={values.nic}
          onChange={(e) => setValues((v) => ({ ...v, nic: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Full name">
        <input
          type="text"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="University (optional)">
        <input
          type="text"
          value={values.university}
          onChange={(e) => setValues((v) => ({ ...v, university: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Home area">
        <input
          type="text"
          placeholder="e.g. Colombo"
          value={values.location}
          onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Areas you can work in" hint="Comma-separated, e.g. Colombo, Kandy">
        <input
          type="text"
          value={values.preferredAreas}
          onChange={(e) => setValues((v) => ({ ...v, preferredAreas: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Preferred job types">
        <div className="flex flex-wrap gap-2">
          {WORKER_SELECTABLE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                values.preferredCategories.includes(category)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {JOB_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </Field>

      <Field label="When are you usually free?">
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`h-10 w-12 rounded-lg border text-xs font-medium ${
                values.availableDays.includes(day)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Skills (optional)" hint="Comma-separated, e.g. forklift, cash handling">
        <input
          type="text"
          value={values.skills}
          onChange={(e) => setValues((v) => ({ ...v, skills: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Languages" hint="Comma-separated, e.g. Sinhala, English">
        <input
          type="text"
          value={values.languages}
          onChange={(e) => setValues((v) => ({ ...v, languages: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.transportAvailable}
          onChange={(e) => setValues((v) => ({ ...v, transportAvailable: e.target.checked }))}
        />
        I have my own transport
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={saving || values.fullName.trim().length === 0 || values.nic.trim().length === 0}
        onClick={save}
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save profile"}
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
