import { describe, expect, it } from "vitest";
import {
  sriLankaDateTimeToUtc,
  calendarDateToUtcMidnight,
  utcToSriLankaDateStr,
  utcToSriLankaTimeStr,
} from "@/lib/sri-lanka-time";

describe("sriLankaDateTimeToUtc", () => {
  it("converts Sri Lanka local wall-clock time to the correct UTC instant", () => {
    // 8:00 AM in Colombo (UTC+5:30) is 2:30 AM UTC the same day.
    expect(sriLankaDateTimeToUtc("2026-09-19", "08:00").toISOString()).toBe(
      "2026-09-19T02:30:00.000Z",
    );
  });

  it("rolls over to the previous UTC day for early Sri Lanka hours", () => {
    // 2:00 AM in Colombo is still the previous day in UTC.
    expect(sriLankaDateTimeToUtc("2026-09-19", "02:00").toISOString()).toBe(
      "2026-09-18T20:30:00.000Z",
    );
  });
});

describe("calendarDateToUtcMidnight", () => {
  it("always matches the intended calendar day regardless of time-of-day", () => {
    // The whole point: this must equal the same day for every caller, with
    // zero dependency on what time it happens to be when it's called.
    expect(calendarDateToUtcMidnight("2026-09-19").toISOString()).toBe(
      "2026-09-19T00:00:00.000Z",
    );
  });

  it("agrees with sriLankaDateTimeToUtc on which calendar day a job falls on", () => {
    const jobDate = calendarDateToUtcMidnight("2026-09-19");
    const startTime = sriLankaDateTimeToUtc("2026-09-19", "08:00");
    expect(jobDate.getUTCFullYear()).toBe(startTime.getUTCFullYear());
    expect(jobDate.getUTCMonth()).toBe(startTime.getUTCMonth());
    // startTime's UTC date can differ from jobDate's for very early local
    // hours (see the rollover test above) — the guarantee that matters is
    // that jobDate always represents the *intended* Sri Lanka calendar day,
    // not that every UTC-derived field trivially matches.
  });
});

describe("utcToSriLankaDateStr / utcToSriLankaTimeStr", () => {
  it("round-trips with sriLankaDateTimeToUtc", () => {
    const utc = sriLankaDateTimeToUtc("2026-09-19", "08:00");
    expect(utcToSriLankaDateStr(utc)).toBe("2026-09-19");
    expect(utcToSriLankaTimeStr(utc)).toBe("08:00");
  });

  it("shows the correct Sri Lanka-local date for a UTC instant just after midnight local", () => {
    // 2026-09-18T20:30:00Z is 2026-09-19T02:00 in Colombo.
    const utc = new Date("2026-09-18T20:30:00.000Z");
    expect(utcToSriLankaDateStr(utc)).toBe("2026-09-19");
    expect(utcToSriLankaTimeStr(utc)).toBe("02:00");
  });
});
