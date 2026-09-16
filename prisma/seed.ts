// Local dev seed data. The coordinator account is deliberately NOT reachable
// through self-registration (blueprint §37: "existing coordinator will be
// the first operational administrator", and only WORKER/EMPLOYER can
// self-serve register per §26 role separation) — so it has to be
// provisioned directly here or by an admin script in a real environment.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const coordinator = await db.user.upsert({
    where: { phone: "+94770000000" },
    update: {},
    create: { phone: "+94770000000", role: "COORDINATOR", accountStatus: "ACTIVE" },
  });

  const workerUser = await db.user.upsert({
    where: { phone: "+94771111111" },
    update: {},
    create: { phone: "+94771111111", role: "WORKER", accountStatus: "ACTIVE" },
  });
  await db.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      fullName: "Nimal Perera",
      university: "University of Colombo",
      preferredCategories: ["EVENT_HELPER", "STOCK_COUNTING"],
      preferredAreas: ["Colombo"],
      skills: [],
      languages: ["Sinhala", "English"],
      transportAvailable: true,
      verificationStatus: "VERIFIED",
    },
  });

  const employerUser = await db.user.upsert({
    where: { phone: "+94772222222" },
    update: {},
    create: { phone: "+94772222222", role: "EMPLOYER", accountStatus: "ACTIVE" },
  });
  const employerProfile = await db.employerProfile.upsert({
    where: { userId: employerUser.id },
    update: {},
    create: {
      userId: employerUser.id,
      businessName: "Cinnamon Grand Colombo",
      contactPerson: "HR Team",
      location: "Colombo",
      employerType: "HOTEL",
      verificationStatus: "VERIFIED",
    },
  });

  // Demo jobs so worker job-browsing (Phase 2) has something to show.
  // Employer-side job creation UI doesn't exist yet (Phase 3), so these go
  // straight to OPEN, skipping DRAFT/PENDING_APPROVAL — a seed-only
  // shortcut, not how a real job reaches OPEN once the approval flow ships.
  //
  // Prisma stores a `@db.Date` column using the UTC calendar day of the
  // JS Date instant it's given. Building `date` from a time-of-day-bearing
  // "now" (e.g. `new Date(now); d.setDate(d.getDate()+2)`) mixes local wall
  // time into that instant, so on an early-morning run in a positive-UTC-
  // offset zone the UTC day rolls back and `date` ends up one day behind
  // `startTime`/`endTime`. Pin the calendar day components first, then
  // derive everything else from those — no time-of-day ever enters `date`.
  const now = new Date();
  function calendarDayOffset(days: number) {
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
    return {
      utcMidnight: new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate())),
      y: local.getFullYear(),
      m: local.getMonth(),
      d: local.getDate(),
    };
  }
  // Server-local time is assumed to be Sri Lanka time here (true for this
  // dev machine). Phase 3's real job-creation form will need to pin this
  // explicitly to Asia/Colombo rather than relying on server-local time,
  // since production will likely run in UTC.
  function atLocalTime(cal: { y: number; m: number; d: number }, hours: number, minutes = 0): Date {
    return new Date(cal.y, cal.m, cal.d, hours, minutes, 0, 0);
  }

  const eventDay = calendarDayOffset(2);
  const stockDay = calendarDayOffset(4);
  const handbillDay = calendarDayOffset(7);

  const demoJobs = [
    {
      id: "seed-job-event-helper",
      title: "Event Helper - Wedding Fair",
      category: "EVENT_HELPER" as const,
      description: "Assist with guest registration, seating and general crowd flow at a wedding fair.",
      date: eventDay.utcMidnight,
      startTime: atLocalTime(eventDay, 8),
      endTime: atLocalTime(eventDay, 18),
      location: "Colombo",
      payPerWorker: "3500.00",
      workersRequired: 20,
      mealsProvided: true,
      transportProvided: false,
      applicationDeadline: atLocalTime(calendarDayOffset(1), 23, 59),
    },
    {
      id: "seed-job-stock-counting",
      title: "Stock Counting - Warehouse",
      category: "STOCK_COUNTING" as const,
      description: "Full-day stock count at a Colombo warehouse. Basic numeracy required.",
      date: stockDay.utcMidnight,
      startTime: atLocalTime(stockDay, 9),
      endTime: atLocalTime(stockDay, 17),
      location: "Colombo",
      payPerWorker: "2500.00",
      workersRequired: 5,
      mealsProvided: false,
      transportProvided: true,
      applicationDeadline: null,
    },
    {
      id: "seed-job-handbill",
      title: "Handbill Distribution - Mall Promo",
      category: "HANDBILL_DISTRIBUTION" as const,
      description: "Distribute promotional flyers outside a shopping mall entrance.",
      date: handbillDay.utcMidnight,
      startTime: atLocalTime(handbillDay, 10),
      endTime: atLocalTime(handbillDay, 16),
      location: "Kandy",
      payPerWorker: "1800.00",
      workersRequired: 10,
      mealsProvided: false,
      transportProvided: false,
      applicationDeadline: atLocalTime(calendarDayOffset(6), 23, 59),
    },
  ];

  for (const j of demoJobs) {
    await db.job.upsert({
      where: { id: j.id },
      // Re-running the seed should refresh these rows to the freshly
      // computed relative dates, not leave stale ones from a previous run
      // in place (bit us once already — see the date/startTime comment
      // above).
      update: {
        title: j.title,
        category: j.category,
        description: j.description,
        workersRequired: j.workersRequired,
        date: j.date,
        startTime: j.startTime,
        endTime: j.endTime,
        location: j.location,
        payPerWorker: j.payPerWorker,
        mealsProvided: j.mealsProvided,
        transportProvided: j.transportProvided,
        applicationDeadline: j.applicationDeadline,
        status: "OPEN",
      },
      create: {
        id: j.id,
        employerId: employerProfile.id,
        title: j.title,
        category: j.category,
        description: j.description,
        workersRequired: j.workersRequired,
        date: j.date,
        startTime: j.startTime,
        endTime: j.endTime,
        location: j.location,
        payPerWorker: j.payPerWorker,
        mealsProvided: j.mealsProvided,
        transportProvided: j.transportProvided,
        applicationDeadline: j.applicationDeadline,
        status: "OPEN",
        approvedByUserId: coordinator.id,
        approvedAt: now,
      },
    });
  }

  console.log("Seeded:");
  console.log(`  Coordinator: ${coordinator.phone}`);
  console.log(`  Worker:      ${workerUser.phone}`);
  console.log(`  Employer:    ${employerUser.phone}`);
  console.log(`  Jobs:        ${demoJobs.length} open demo jobs`);
  console.log("Log in with LOGIN purpose + the OTP printed to the dev server console.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
