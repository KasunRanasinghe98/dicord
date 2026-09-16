// Deterministic matching/refill engine (blueprint §14, §24). Explicitly NOT
// AI — eligibility is a hard filter, ranking is a transparent weighted sum
// so the coordinator can always explain why a worker was or wasn't offered
// a job.

export interface CandidateWorker {
  workerProfileId: string;
  isActive: boolean;
  preferredCategories: string[];
  preferredAreas: string[];
  hasConflictingAssignment: boolean;
  requiredSkills: string[];
  workerSkills: string[];
  completedJobsInCategory: number;
  attendanceRate: number; // 0..1
  recentAssignmentCount: number; // workload in the last N days
}

export interface JobForMatching {
  category: string;
  location: string;
  requiredSkills: string[];
}

export function isEligible(worker: CandidateWorker, job: JobForMatching): boolean {
  if (!worker.isActive) return false;
  if (worker.hasConflictingAssignment) return false;
  if (job.requiredSkills.length > 0) {
    const hasAllSkills = job.requiredSkills.every((skill) =>
      worker.workerSkills.includes(skill),
    );
    if (!hasAllSkills) return false;
  }
  return true;
}

// Higher is better. Every factor is documented so ranking stays explainable
// (§24: "the goal is predictable and explainable behaviour").
export function scoreCandidate(worker: CandidateWorker, job: JobForMatching): number {
  let score = 0;

  if (worker.preferredCategories.includes(job.category)) score += 30;
  if (worker.preferredAreas.includes(job.location)) score += 20;

  score += Math.min(worker.completedJobsInCategory, 10) * 3; // cap: experience plateaus
  score += worker.attendanceRate * 25;
  score -= Math.min(worker.recentAssignmentCount, 5) * 4; // spread workload

  return score;
}

export function rankCandidates(
  candidates: CandidateWorker[],
  job: JobForMatching,
): CandidateWorker[] {
  return candidates
    .filter((c) => isEligible(c, job))
    .sort((a, b) => scoreCandidate(b, job) - scoreCandidate(a, job));
}

// Builds the sequential refill order for one vacated position: candidate A
// is offered first; on timeout/decline the caller moves to candidate B, etc.
// (§14). This function only computes order — the notify-then-wait sequencing
// is a runtime concern (job queue / cron), not this pure function's job.
export function buildReplacementSequence(
  candidates: CandidateWorker[],
  job: JobForMatching,
  excludeWorkerProfileIds: Set<string>,
): CandidateWorker[] {
  return rankCandidates(
    candidates.filter((c) => !excludeWorkerProfileIds.has(c.workerProfileId)),
    job,
  );
}
