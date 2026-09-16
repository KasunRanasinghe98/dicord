import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { requireOwnJob } from "@/server/employers/guard";
import { assertJobTransition } from "@/server/jobs/state-machine";
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

  try {
    assertJobTransition(owned.job.status, "PENDING_APPROVAL");
  } catch {
    return NextResponse.json(
      { error: "Only draft jobs can be submitted for approval." },
      { status: 400 },
    );
  }

  const job = await db.job.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_SUBMITTED_FOR_APPROVAL",
    targetType: "Job",
    targetId: job.id,
  });

  return NextResponse.json({ ok: true, job });
}
