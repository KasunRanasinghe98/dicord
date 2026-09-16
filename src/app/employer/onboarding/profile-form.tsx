"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmployerType } from "@prisma/client";
import { EMPLOYER_TYPE_LABELS } from "@/lib/constants";

export interface EmployerProfileFormValues {
  businessName: string;
  contactPerson: string;
  location: string;
  employerType: EmployerType | "";
}

const EMPTY: EmployerProfileFormValues = {
  businessName: "",
  contactPerson: "",
  location: "",
  employerType: "",
};

export function ProfileForm({ initial }: { initial: EmployerProfileFormValues | null }) {
  const router = useRouter();
  const [values, setValues] = useState<EmployerProfileFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/employer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save profile.");
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
      <Field label="Business name">
        <input
          type="text"
          value={values.businessName}
          onChange={(e) => setValues((v) => ({ ...v, businessName: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Contact person">
        <input
          type="text"
          value={values.contactPerson}
          onChange={(e) => setValues((v) => ({ ...v, contactPerson: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Location">
        <input
          type="text"
          placeholder="e.g. Colombo"
          value={values.location}
          onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Business type">
        <select
          value={values.employerType}
          onChange={(e) =>
            setValues((v) => ({ ...v, employerType: e.target.value as EmployerType }))
          }
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select one
          </option>
          {Object.entries(EMPLOYER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={
          saving ||
          values.businessName.trim().length === 0 ||
          values.contactPerson.trim().length === 0 ||
          values.employerType === ""
        }
        onClick={save}
        className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
