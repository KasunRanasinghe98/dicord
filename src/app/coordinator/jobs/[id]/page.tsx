import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db";
import { JOB_CATEGORY_LABELS } from "@/lib/constants";
import { formatStatus } from "@/lib/format";
import { isOpenForApplications } from "@/server/jobs/state-machine";
import { rankCandidates, scoreCandidate } from "@/server/matching/engine";
import { buildCandidateWorker } from "@/server/matching/build-candidate";
import { JobApprovalActions } from "../../job-approval-actions";
import { ActionButton } from "@/app/action-button";

export const dynamic = "force-dynamic";

export default async function CoordinatorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    include: { employer: { select: { businessName: true } } },
  });
  if (!job) notFound();

  const [applications, assignments] = await Promise.all([
    db.application.findMany({
      where: { jobId: id },
      include: { worker: { select: { id: true, fullName: true, verificationStatus: true } } },
      orderBy: { appliedAt: "asc" },
    }),
    db.assignment.findMany({
      where: { jobId: id },
      include: { worker: { select: { fullName: true } }, attendance: true },
      orderBy: { confirmedAt: "asc" },
    }),
  ]);

  const applicants = applications.filter((a) => a.status === "APPLIED" || a.status === "SHORTLISTED");
  const selected = applications.filter((a) => a.status === "SELECTED");
  const history = applications.filter((a) => a.status === "DECLINED" || a.status === "WITHDRAWN");
  const activeAssignments = assignments.filter((a) => a.status === "CONFIRMED");
  const pastAssignments = assignments.filter((a) => a.status !== "CONFIRMED");

  const needsReplacements =
    isOpenForApplications(job.status) && activeAssignments.length < job.workersRequired;

  let suggestions: Array<{ workerProfileId: string; fullName: string; score: number }> = [];
  if (needsReplacements) {
    const jobForMatching = {
      category: job.category,
      location: job.location,
      requiredSkills: job.requiredSkills,
    };
    const involvedIds = applications.map((a) => a.workerProfileId);
    const candidateProfiles = await db.workerProfile.findMany({
      where: { id: { notIn: involvedIds }, user: { accountStatus: "ACTIVE" } },
      take: 50,
    });
    const candidates = await Promise.all(
      candidateProfiles.map((p) => buildCandidateWorker(db, p, job)),
    );
    const ranked = rankCandidates(candidates, jobForMatching).slice(0, 5);
    suggestions = ranked.map((c) => ({
      workerProfileId: c.workerProfileId,
      fullName: candidateProfiles.find((p) => p.id === c.workerProfileId)!.fullName,
      score: scoreCandidate(c, jobForMatching),
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/coordinator/jobs" className="text-xs text-neutral-500 underline">
          All jobs
        </Link>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          {formatStatus(job.status)}
        </span>
      </div>

      <div>
        <h1 className="text-lg font-semibold">{job.title}</h1>
        <p className="text-sm text-neutral-500">
          {job.employer.businessName} · {JOB_CATEGORY_LABELS[job.category]}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {activeAssignments.length} / {job.workersRequired} confirmed · Rs.{" "}
          {job.payPerWorker.toString()} per worker · {job.location}
        </p>
      </div>

      {job.status === "PENDING_APPROVAL" && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-medium text-neutral-700">Awaiting your approval</h2>
          <div className="mt-2">
            <JobApprovalActions jobId={job.id} />
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        {(job.status === "OPEN" || job.status === "PARTIALLY_FILLED" || job.status === "FULL") && (
          <ActionButton
            endpoint={`/api/coordinator/jobs/${job.id}/start`}
            label="Start job"
            pendingLabel="Starting..."
            variant="primary"
          />
        )}
        {job.status === "IN_PROGRESS" && (
          <ActionButton
            endpoint={`/api/coordinator/jobs/${job.id}/complete`}
            label="Mark job completed"
            pendingLabel="Completing..."
            variant="primary"
            confirmMessage="Mark this job as completed? This finalizes attendance for every confirmed worker."
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Applicants ({applicants.length})
        </h2>
        {applicants.length === 0 ? (
          <p className="text-sm text-neutral-400">No open applications.</p>
        ) : (
          applicants.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
              <span className="text-sm">{a.worker.fullName}</span>
              <ActionButton
                endpoint={`/api/coordinator/applications/${a.id}/select`}
                label="Select"
                pendingLabel="Selecting..."
                variant="primary"
              />
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Selected — awaiting worker confirmation ({selected.length})
        </h2>
        {selected.length === 0 ? (
          <p className="text-sm text-neutral-400">Nobody pending confirmation.</p>
        ) : (
          selected.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
              <span className="text-sm">{a.worker.fullName}</span>
              <ActionButton
                endpoint={`/api/coordinator/applications/${a.id}/withdraw`}
                label="Withdraw offer"
                pendingLabel="Withdrawing..."
                variant="danger"
              />
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Confirmed workers ({activeAssignments.length})
        </h2>
        {activeAssignments.length === 0 ? (
          <p className="text-sm text-neutral-400">No confirmed workers yet.</p>
        ) : (
          activeAssignments.map((a) => (
            <div key={a.id} className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{a.worker.fullName}</span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  {a.attendance ? formatStatus(a.attendance.status) : "—"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <ActionButton
                  endpoint={`/api/coordinator/assignments/${a.id}/attendance`}
                  body={{ status: "PRESENT" }}
                  label="Present"
                />
                <ActionButton
                  endpoint={`/api/coordinator/assignments/${a.id}/attendance`}
                  body={{ status: "LATE" }}
                  label="Late"
                />
                <ActionButton
                  endpoint={`/api/coordinator/assignments/${a.id}/attendance`}
                  body={{ status: "ABSENT" }}
                  label="Absent"
                />
                <ActionButton
                  endpoint={`/api/coordinator/assignments/${a.id}/cancel`}
                  label="Cancel"
                  pendingLabel="Cancelling..."
                  variant="danger"
                  confirmMessage="Cancel this worker's confirmed assignment?"
                />
              </div>
            </div>
          ))
        )}
      </section>

      {needsReplacements && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500">Suggested replacements</h2>
          {suggestions.length === 0 ? (
            <p className="text-sm text-neutral-400">
              No eligible workers found right now.
            </p>
          ) : (
            suggestions.map((s) => (
              <div key={s.workerProfileId} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <span className="text-sm">
                  {s.fullName}{" "}
                  <span className="text-xs text-neutral-400">match score {s.score}</span>
                </span>
                <ActionButton
                  endpoint={`/api/coordinator/jobs/${job.id}/offer`}
                  body={{ workerProfileId: s.workerProfileId }}
                  label="Offer position"
                  pendingLabel="Offering..."
                  variant="primary"
                />
              </div>
            ))
          )}
        </section>
      )}

      {(history.length > 0 || pastAssignments.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-500">History</h2>
          {history.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm text-neutral-500">
              <span>{a.worker.fullName}</span>
              <span>{formatStatus(a.status)}</span>
            </div>
          ))}
          {pastAssignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm text-neutral-500">
              <span>{a.worker.fullName}</span>
              <span>{formatStatus(a.status)}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
