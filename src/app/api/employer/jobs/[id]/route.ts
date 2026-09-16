import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { requireOwnJob } from "@/server/employers/guard";
import { jobInputSchema, toJobData } from "@/server/employers/job-schema";
import { logAudit } from "@/server/audit/log";

// Editing is only allowed pre-submission. Once a job is PENDING_APPROVAL or
// later it's "live" in the coordinator's/workers' view, and blueprint §28
// requires a live job's edits to preserve an audit trail — a bigger feature
// than v0.1 needs. Cancel-and-recreate is the escape hatch for now.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("EMPLOYER");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const owned = await requireOwnJob(auth.session.userId, id);
  if ("error" in owned) return owned.error;

  if (owned.job.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft jobs can be edited. Cancel this job and create a new one instead." },
      { status: 400 },
    );
  }

  const parsed = jobInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = toJobData(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const job = await db.job.update({ where: { id }, data: result.value });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_EDITED",
    targetType: "Job",
    targetId: job.id,
  });

  return NextResponse.json({ ok: true, job });
}
