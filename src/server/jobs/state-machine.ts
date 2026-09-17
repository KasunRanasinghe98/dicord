import type { ApplicationStatus, AssignmentStatus, JobStatus } from "@prisma/client";

// Blueprint §11 lists these statuses but leaves the graph implicit; this is
// the explicit state machine referenced by §36 ("Keep the state machine
// explicit in code"). Terminal states (COMPLETED, CANCELLED) have no
// outgoing edges — §28: "Completed jobs should not silently change state."
// OPEN/PARTIALLY_FILLED/FULL are headcount-driven, not a one-way pipeline:
// confirmed-count can move up or down in either direction as workers are
// selected, confirmed or cancel (§28: "a cancelled assignment should free a
// position"), so all three must be mutually reachable — including a
// PARTIALLY_FILLED or FULL job dropping all the way back to OPEN if every
// confirmed worker cancels. (An earlier version of this graph only allowed
// forward-filling transitions and missed that a mass-cancellation could
// leave a job with zero confirmed workers with nowhere legal to go.)
const HEADCOUNT_STATUSES: JobStatus[] = ["OPEN", "PARTIALLY_FILLED", "FULL"];

// A coordinator can choose to lock in and start a job that's only
// PARTIALLY_FILLED (running short-staffed is a real call they get to make —
// §4: "the coordinator must retain manual override/control"), not only one
// that reached FULL. The route layer still requires at least one confirmed
// worker before actually starting.
const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["OPEN", "CANCELLED"],
  OPEN: ["PARTIALLY_FILLED", "FULL", "CONFIRMATION", "CANCELLED"],
  PARTIALLY_FILLED: ["OPEN", "FULL", "CONFIRMATION", "CANCELLED"],
  FULL: ["OPEN", "PARTIALLY_FILLED", "CONFIRMATION", "CANCELLED"],
  // A job already locked into CONFIRMATION can still unravel if confirmed
  // workers cancel before the shift — it can fall back to any headcount
  // status, not just PARTIALLY_FILLED.
  CONFIRMATION: [...HEADCOUNT_STATUSES, "IN_PROGRESS", "CANCELLED"],
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

// A worker can submit an application while the job is still accepting them.
// PENDING_APPROVAL/DRAFT jobs aren't visible to workers at all (§13), and
// FULL/CONFIRMATION+ jobs are no longer taking new applicants.
export function isOpenForApplications(status: JobStatus): boolean {
  return status === "OPEN" || status === "PARTIALLY_FILLED";
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

// An Assignment only exists once an Application reaches CONFIRMED, and from
// there it has exactly one open question: did the worker show up. All three
// outcomes are terminal — a completed/no-show/cancelled assignment is a
// historical record, never revised in place.
const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  CONFIRMED: ["CANCELLED", "COMPLETED", "NO_SHOW"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransitionAssignment(from: AssignmentStatus, to: AssignmentStatus): boolean {
  return ASSIGNMENT_TRANSITIONS[from].includes(to);
}

export function assertAssignmentTransition(from: AssignmentStatus, to: AssignmentStatus): void {
  if (!canTransitionAssignment(from, to)) {
    throw new Error(`Illegal assignment transition: ${from} -> ${to}`);
  }
}
