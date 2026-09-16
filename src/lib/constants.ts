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

// Employers posting a job can pick OTHER too — the pilot's four categories
// are what we expect and optimize for (§3), not a hard restriction on what
// an employer is allowed to request.
export const ALL_JOB_CATEGORIES: JobCategory[] = [...WORKER_SELECTABLE_CATEGORIES, "OTHER"];

export const EMPLOYER_TYPE_LABELS: Record<string, string> = {
  TUITION: "Tuition / education",
  FLOWER_SHOP: "Flower shop",
  HOTEL: "Hotel",
  SPARE_PARTS_COMPANY: "Spare parts company",
  EVENT_ORGANIZER: "Event organizer",
  OTHER: "Other",
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
