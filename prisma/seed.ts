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
  await db.employerProfile.upsert({
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

  console.log("Seeded:");
  console.log(`  Coordinator: ${coordinator.phone}`);
  console.log(`  Worker:      ${workerUser.phone}`);
  console.log(`  Employer:    ${employerUser.phone}`);
  console.log("Log in with LOGIN purpose + the OTP printed to the dev server console.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
