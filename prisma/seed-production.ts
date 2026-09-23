// Provisions exactly one real COORDINATOR account — nothing else. The full
// prisma/seed.ts (fake coordinator/worker/employer/jobs) is for local dev
// only and must never run against a production database.
//
// Usage:
//   DATABASE_URL="<production connection string>" COORDINATOR_PHONE="0771234567" npx tsx prisma/seed-production.ts
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/lib/phone";

const db = new PrismaClient();

async function main() {
  const raw = process.env.COORDINATOR_PHONE;
  if (!raw) {
    throw new Error(
      "Set COORDINATOR_PHONE to the real coordinator's phone number before running this.",
    );
  }
  const phone = normalizePhone(raw);

  const coordinator = await db.user.upsert({
    where: { phone },
    update: { role: "COORDINATOR", accountStatus: "ACTIVE" },
    create: { phone, role: "COORDINATOR", accountStatus: "ACTIVE" },
  });

  console.log(`Coordinator account ready: ${coordinator.phone} (id ${coordinator.id})`);
  console.log("Log in with purpose LOGIN — no self-registration path reaches this role.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
