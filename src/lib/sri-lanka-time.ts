// Every user is in Sri Lanka (UTC+5:30, no DST), but the server won't
// always be — local dev happens to run in Asia/Colombo (see
// prisma/seed.ts's postmortem on that), but production (Vercel) runs in
// UTC. Job date/time input must be interpreted as Sri Lanka wall-clock time
// explicitly, never via server-local `Date` semantics, or the same
// off-by-one-day class of bug resurfaces the moment this deploys.
const SRI_LANKA_UTC_OFFSET_MINUTES = 5 * 60 + 30;

// Combines a "YYYY-MM-DD" date and "HH:MM" time, both meant as Sri Lanka
// local wall-clock time, into the correct UTC instant.
export function sriLankaDateTimeToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const utcMs =
    Date.UTC(year, month - 1, day, hours, minutes) - SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

// The `@db.Date`-safe UTC-midnight instant for a "YYYY-MM-DD" calendar
// day — built directly from the numeric components, never from a
// time-of-day-bearing `Date`, so it can't drift a day depending on what
// time the write happens to run at.
export function calendarDateToUtcMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// The inverse of the two functions above — for pre-filling edit forms.
// Computed via the fixed Sri Lanka offset, never `.getHours()`/`.getDate()`
// (which would read the *server's* local timezone instead).
export function utcToSriLankaDateStr(date: Date): string {
  const shifted = new Date(date.getTime() + SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function utcToSriLankaTimeStr(date: Date): string {
  const shifted = new Date(date.getTime() + SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000);
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  const min = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}
