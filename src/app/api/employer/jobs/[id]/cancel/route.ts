import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { requireOwnJob } from "@/server/employers/guard";
import { canTransitionJob } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("EMPLOYER");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const owned = await requireOwnJob(auth.session.userId, id);
  if ("error" in owned) return owned.error;

  if (!canTransitionJob(owned.job.status, "CANCELLED")) {
    return NextResponse.json(
      { error: "This job can no longer be cancelled." },
      { status: 400 },
    );
  }

  const job = await db.job.update({ where: { id }, data: { status: "CANCELLED" } });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_CANCELLED",
    targetType: "Job",
    targetId: job.id,
  });

  return NextResponse.json({ ok: true, job });
}
