import { JobCategory } from "@prisma/client";

// Blueprint §3: these four are the only categories for the v0.1 pilot.
// OTHER exists in the schema for coordinator flexibility but isn't offered
// as a worker preference yet.
export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  HANDBILL_DISTRIBUTION: "Handbill distribution",
  STOCK_COUNTING: "Stock counting",
  EVENT_HELPER: "Event helper",
  CROWD_HANDLING: "Crowd handling",
  OTHER: "Other",
};

export const WORKER_SELECTABLE_CATEGORIES: JobCategory[] = [
  "HANDBILL_DISTRIBUTION",
  "STOCK_COUNTING",
  "EVENT_HELPER",
  "CROWD_HANDLING",
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
