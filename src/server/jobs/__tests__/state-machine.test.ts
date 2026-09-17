import { describe, expect, it } from "vitest";
import {
  canTransitionJob,
  assertJobTransition,
  isTerminalJobStatus,
  deriveHeadcountStatus,
  isOpenForApplications,
  canTransitionApplication,
  canTransitionAssignment,
  assertAssignmentTransition,
} from "@/server/jobs/state-machine";

describe("job state machine", () => {
  it("allows the happy path", () => {
    expect(canTransitionJob("DRAFT", "PENDING_APPROVAL")).toBe(true);
    expect(canTransitionJob("PENDING_APPROVAL", "OPEN")).toBe(true);
    expect(canTransitionJob("OPEN", "FULL")).toBe(true);
    expect(canTransitionJob("FULL", "CONFIRMATION")).toBe(true);
    expect(canTransitionJob("CONFIRMATION", "IN_PROGRESS")).toBe(true);
    expect(canTransitionJob("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("allows a FULL job to drop back to PARTIALLY_FILLED on a late cancellation", () => {
    expect(canTransitionJob("FULL", "PARTIALLY_FILLED")).toBe(true);
  });

  it("allows headcount to unravel all the way back to OPEN from any fill level", () => {
    // Every confirmed worker can cancel, in which case the job has zero
    // confirmed workers again and must be able to say so.
    expect(canTransitionJob("PARTIALLY_FILLED", "OPEN")).toBe(true);
    expect(canTransitionJob("FULL", "OPEN")).toBe(true);
    expect(canTransitionJob("CONFIRMATION", "OPEN")).toBe(true);
  });

  it("allows a locked-in CONFIRMATION job to fall back to any headcount status", () => {
    expect(canTransitionJob("CONFIRMATION", "PARTIALLY_FILLED")).toBe(true);
    expect(canTransitionJob("CONFIRMATION", "FULL")).toBe(true);
  });

  it("lets a coordinator start a job that's only PARTIALLY_FILLED, not just FULL", () => {
    // Caught via manual end-to-end testing: "Start job" only worked from
    // FULL because CONFIRMATION wasn't reachable from PARTIALLY_FILLED/OPEN,
    // even though running short-staffed is a legitimate coordinator call.
    expect(canTransitionJob("PARTIALLY_FILLED", "CONFIRMATION")).toBe(true);
    expect(canTransitionJob("OPEN", "CONFIRMATION")).toBe(true);
  });

  it("rejects skipping straight from DRAFT to COMPLETED", () => {
    expect(canTransitionJob("DRAFT", "COMPLETED")).toBe(false);
    expect(() => assertJobTransition("DRAFT", "COMPLETED")).toThrow();
  });

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(isTerminalJobStatus("COMPLETED")).toBe(true);
    expect(isTerminalJobStatus("CANCELLED")).toBe(true);
    expect(canTransitionJob("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("derives headcount status from confirmed count vs. required", () => {
    expect(deriveHeadcountStatus(0, 20)).toBe("OPEN");
    expect(deriveHeadcountStatus(17, 20)).toBe("PARTIALLY_FILLED");
    expect(deriveHeadcountStatus(20, 20)).toBe("FULL");
  });

  it("only accepts new applications while OPEN or PARTIALLY_FILLED", () => {
    expect(isOpenForApplications("OPEN")).toBe(true);
    expect(isOpenForApplications("PARTIALLY_FILLED")).toBe(true);
    expect(isOpenForApplications("DRAFT")).toBe(false);
    expect(isOpenForApplications("PENDING_APPROVAL")).toBe(false);
    expect(isOpenForApplications("FULL")).toBe(false);
    expect(isOpenForApplications("COMPLETED")).toBe(false);
  });
});

describe("application state machine", () => {
  it("does not allow confirming an attendance-marked application to go back to APPLIED", () => {
    expect(canTransitionApplication("ATTENDED", "APPLIED")).toBe(false);
  });

  it("allows the selection happy path", () => {
    expect(canTransitionApplication("APPLIED", "SHORTLISTED")).toBe(true);
    expect(canTransitionApplication("SHORTLISTED", "SELECTED")).toBe(true);
    expect(canTransitionApplication("SELECTED", "CONFIRMED")).toBe(true);
    expect(canTransitionApplication("CONFIRMED", "ATTENDED")).toBe(true);
    expect(canTransitionApplication("ATTENDED", "COMPLETED")).toBe(true);
  });

  it("a cancelled application cannot be revived", () => {
    expect(canTransitionApplication("CANCELLED", "CONFIRMED")).toBe(false);
  });
});

describe("assignment state machine", () => {
  it("allows CONFIRMED to resolve to any of the three outcomes", () => {
    expect(canTransitionAssignment("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionAssignment("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransitionAssignment("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("treats every outcome as terminal — no revising history", () => {
    expect(canTransitionAssignment("COMPLETED", "CONFIRMED")).toBe(false);
    expect(canTransitionAssignment("NO_SHOW", "COMPLETED")).toBe(false);
    expect(() => assertAssignmentTransition("CANCELLED", "CONFIRMED")).toThrow();
  });
});
