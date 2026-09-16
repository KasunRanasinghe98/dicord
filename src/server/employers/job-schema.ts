import { z } from "zod";
import { JobCategory } from "@prisma/client";
import { parseCsvList } from "@/lib/csv";
import { sriLankaDateTimeToUtc, calendarDateToUtcMidnight } from "@/lib/sri-lanka-time";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, "Invalid time.");

export const jobInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  category: z.nativeEnum(JobCategory),
  description: z.string().trim().min(1, "Description is required."),
  workersRequired: z.coerce.number().int().min(1, "At least 1 worker is required."),
  date: dateStr,
  startTime: timeStr,
  endTime: timeStr,
  location: z.string().trim().min(1, "Location is required."),
  payPerWorker: z.coerce.number().positive("Pay must be greater than 0."),
  mealsProvided: z.boolean().default(false),
  transportProvided: z.boolean().default(false),
  requiredSkills: z.string().optional().default(""),
  applicationDeadline: z.union([dateStr, z.literal("")]).optional().default(""),
});

export type JobInput = z.infer<typeof jobInputSchema>;

// Shared by create and edit routes so both apply exactly the same cross-
// field rules — all times are interpreted as Sri Lanka wall-clock time
// (see src/lib/sri-lanka-time.ts).
export function toJobData(data: JobInput):
  | { ok: true; value: ReturnType<typeof buildJobData> }
  | { ok: false; error: string } {
  const startTime = sriLankaDateTimeToUtc(data.date, data.startTime);
  const endTime = sriLankaDateTimeToUtc(data.date, data.endTime);
  if (endTime <= startTime) {
    return { ok: false, error: "End time must be after start time." };
  }

  let applicationDeadline: Date | null = null;
  if (data.applicationDeadline) {
    applicationDeadline = calendarDateToUtcMidnight(data.applicationDeadline);
    if (applicationDeadline > startTime) {
      return { ok: false, error: "Application deadline must be before the job starts." };
    }
  }

  return { ok: true, value: buildJobData(data, startTime, endTime, applicationDeadline) };
}

function buildJobData(
  data: JobInput,
  startTime: Date,
  endTime: Date,
  applicationDeadline: Date | null,
) {
  return {
    title: data.title,
    category: data.category,
    description: data.description,
    workersRequired: data.workersRequired,
    date: calendarDateToUtcMidnight(data.date),
    startTime,
    endTime,
    location: data.location,
    payPerWorker: data.payPerWorker.toFixed(2),
    mealsProvided: data.mealsProvided,
    transportProvided: data.transportProvided,
    requiredSkills: parseCsvList(data.requiredSkills),
    applicationDeadline,
  };
}
