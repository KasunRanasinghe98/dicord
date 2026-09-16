import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { ProfileForm } from "./profile-form";

export default async function EmployerOnboardingPage() {
  const session = await getSession();
  const profile = session
    ? await db.employerProfile.findUnique({ where: { userId: session.userId } })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-semibold">
        {profile ? "Edit business profile" : "Set up your business profile"}
      </h1>
      <p className="text-sm text-neutral-500">
        This is what the coordinator sees when reviewing your jobs.
      </p>
      <ProfileForm
        initial={
          profile
            ? {
                businessName: profile.businessName,
                contactPerson: profile.contactPerson,
                location: profile.location ?? "",
                employerType: profile.employerType,
              }
            : null
        }
      />
    </main>
  );
}
