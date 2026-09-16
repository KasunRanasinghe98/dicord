import { JobForm } from "../job-form";

export default function NewJobPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-semibold">Post a job</h1>
      <p className="text-sm text-neutral-500">
        This saves as a draft first — you&apos;ll submit it for the
        coordinator&apos;s approval from your job list.
      </p>
      <JobForm />
    </main>
  );
}
