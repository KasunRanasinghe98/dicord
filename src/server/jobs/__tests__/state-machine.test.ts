import { describe, expect, it } from "vitest";
import {
  canTransitionJob,
  assertJobTransition,
  isTerminalJobStatus,
  deriveHeadcountStatus,
  canTransitionApplication,
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
