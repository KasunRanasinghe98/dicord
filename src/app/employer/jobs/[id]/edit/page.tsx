import { notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { utcToSriLankaDateStr, utcToSriLankaTimeStr } from "@/lib/sri-lanka-time";
import { JobForm } from "../../job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) notFound();

  const employerProfile = await db.employerProfile.findUnique({
    where: { userId: session.userId },
  });
  const job = employerProfile
    ? await db.job.findFirst({ where: { id, employerId: employerProfile.id } })
    : null;

  if (!job) notFound();

  if (job.status !== "DRAFT") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
        <h1 className="text-lg font-semibold">{job.title}</h1>
        <p className="text-sm text-neutral-500">
          This job has already been submitted and can no longer be edited.
          Cancel it from your job list if you need to change the details.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-semibold">Edit job</h1>
      <JobForm
        jobId={job.id}
        initial={{
          title: job.title,
          category: job.category,
          description: job.description,
          workersRequired: String(job.workersRequired),
          date: utcToSriLankaDateStr(job.date),
          startTime: utcToSriLankaTimeStr(job.startTime),
          endTime: utcToSriLankaTimeStr(job.endTime),
          location: job.location,
          payPerWorker: job.payPerWorker.toString(),
          mealsProvided: job.mealsProvided,
          transportProvided: job.transportProvided,
          requiredSkills: job.requiredSkills.join(", "),
          applicationDeadline: job.applicationDeadline
            ? utcToSriLankaDateStr(job.applicationDeadline)
            : "",
        }}
      />
    </main>
  );
}
