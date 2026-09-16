import { describe, expect, it } from "vitest";
import {
  isEligible,
  rankCandidates,
  buildReplacementSequence,
  type CandidateWorker,
  type JobForMatching,
} from "@/server/matching/engine";

const job: JobForMatching = {
  category: "EVENT_HELPER",
  location: "Colombo",
  requiredSkills: [],
};

function makeWorker(overrides: Partial<CandidateWorker> = {}): CandidateWorker {
  return {
    workerProfileId: "w1",
    isActive: true,
    preferredCategories: [],
    preferredAreas: [],
    hasConflictingAssignment: false,
    requiredSkills: [],
    workerSkills: [],
    completedJobsInCategory: 0,
    attendanceRate: 1,
    recentAssignmentCount: 0,
    ...overrides,
  };
}

describe("matching eligibility", () => {
  it("excludes inactive workers", () => {
    expect(isEligible(makeWorker({ isActive: false }), job)).toBe(false);
  });

  it("excludes workers with a conflicting assignment", () => {
    expect(isEligible(makeWorker({ hasConflictingAssignment: true }), job)).toBe(false);
  });

  it("excludes workers missing a required skill", () => {
    const skilledJob: JobForMatching = { ...job, requiredSkills: ["forklift"] };
    expect(isEligible(makeWorker({ workerSkills: [] }), skilledJob)).toBe(false);
    expect(isEligible(makeWorker({ workerSkills: ["forklift"] }), skilledJob)).toBe(true);
  });
});

describe("ranking", () => {
  it("ranks category-preference and location-match workers above generic ones", () => {
    const matched = makeWorker({
      workerProfileId: "matched",
      preferredCategories: ["EVENT_HELPER"],
      preferredAreas: ["Colombo"],
    });
    const generic = makeWorker({ workerProfileId: "generic" });

    const ranked = rankCandidates([generic, matched], job);
    expect(ranked[0].workerProfileId).toBe("matched");
  });

  it("penalizes workers with a heavier recent workload", () => {
    const busy = makeWorker({ workerProfileId: "busy", recentAssignmentCount: 5 });
    const free = makeWorker({ workerProfileId: "free", recentAssignmentCount: 0 });

    const ranked = rankCandidates([busy, free], job);
    expect(ranked[0].workerProfileId).toBe("free");
  });
});

describe("replacement sequencing", () => {
  it("excludes the worker who just cancelled from their own replacement queue", () => {
    const cancelled = makeWorker({ workerProfileId: "cancelled" });
    const backup = makeWorker({ workerProfileId: "backup" });

    const sequence = buildReplacementSequence(
      [cancelled, backup],
      job,
      new Set(["cancelled"]),
    );

    expect(sequence.map((c) => c.workerProfileId)).toEqual(["backup"]);
  });
});
