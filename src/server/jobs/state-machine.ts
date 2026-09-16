import type { ApplicationStatus, JobStatus } from "@prisma/client";

// Blueprint §11 lists these statuses but leaves the graph implicit; this is
// the explicit state machine referenced by §36 ("Keep the state machine
// explicit in code"). Terminal states (COMPLETED, CANCELLED) have no
// outgoing edges — §28: "Completed jobs should not silently change state."
const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["OPEN", "CANCELLED"],
  OPEN: ["PARTIALLY_FILLED", "FULL", "CANCELLED"],
  PARTIALLY_FILLED: ["FULL", "CANCELLED"],
  // A FULL job can drop back to PARTIALLY_FILLED if a confirmed worker
  // cancels before a replacement is found.
  FULL: ["CONFIRMATION", "PARTIALLY_FILLED", "CANCELLED"],
  CONFIRMATION: ["IN_PROGRESS", "PARTIALLY_FILLED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}

export function assertJobTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJob(from, to)) {
    throw new Error(`Illegal job transition: ${from} -> ${to}`);
  }
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return JOB_TRANSITIONS[status].length === 0;
}

// Derives status from current confirmed-assignment count vs. positions
// required. Does not decide CANCELLED/CONFIRMATION/IN_PROGRESS/COMPLETED —
// those are explicit coordinator/employer actions, not headcount side
// effects.
export function deriveHeadcountStatus(
  confirmedCount: number,
  workersRequired: number,
): "OPEN" | "PARTIALLY_FILLED" | "FULL" {
  if (confirmedCount <= 0) return "OPEN";
  if (confirmedCount >= workersRequired) return "FULL";
  return "PARTIALLY_FILLED";
}

// Blueprint §12: APPLIED is not ASSIGNED. Assignment creation happens
// outside this graph once an application reaches CONFIRMED.
const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ["SHORTLISTED", "SELECTED", "DECLINED", "WITHDRAWN"],
  SHORTLISTED: ["SELECTED", "DECLINED", "WITHDRAWN"],
  SELECTED: ["CONFIRMED", "DECLINED", "WITHDRAWN"],
  CONFIRMED: ["CANCELLED", "ATTENDED", "NO_SHOW"],
  ATTENDED: ["COMPLETED"],
  DECLINED: [],
  WITHDRAWN: [],
  CANCELLED: [],
  NO_SHOW: [],
  COMPLETED: [],
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export function assertApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(`Illegal application transition: ${from} -> ${to}`);
  }
}
