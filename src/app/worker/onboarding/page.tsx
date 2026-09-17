import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { ProfileForm } from "./profile-form";

export default async function WorkerOnboardingPage() {
  const session = await getSession();
  const profile = session
    ? await db.workerProfile.findUnique({
        where: { userId: session.userId },
        include: { availability: true },
      })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-semibold">
        {profile ? "Edit your profile" : "Complete your profile"}
      </h1>
      <p className="text-sm text-neutral-500">
        This is what employers and the coordinator will see when matching you
        to jobs.
      </p>
      <ProfileForm
        initial={
          profile
            ? {
                nic: profile.nic,
                fullName: profile.fullName,
                university: profile.university ?? "",
                location: profile.location ?? "",
                preferredAreas: profile.preferredAreas.join(", "),
                preferredCategories: profile.preferredCategories,
                skills: profile.skills.join(", "),
                languages: profile.languages.join(", "),
                transportAvailable: profile.transportAvailable,
                availableDays: profile.availability
                  .filter((a) => a.isAvailable)
                  .map((a) => a.dayOfWeek),
              }
            : null
        }
      />
    </main>
  );
}
