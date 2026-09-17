import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertJobTransition } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

// Moves a filled job into IN_PROGRESS. Validated as two hops
// (-> CONFIRMATION -> IN_PROGRESS) to keep the state machine's intent
// honest, but written as a single update — CONFIRMATION has no separate UI
// step in v0.1 (blueprint's pre-shift "confirm attendance" is gated on the
// Assignment/Attendance records directly, not on this job-level status).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  try {
    assertJobTransition(job.status, "CONFIRMATION");
    assertJobTransition("CONFIRMATION", "IN_PROGRESS");
  } catch {
    return NextResponse.json({ error: "This job can't be started from its current status." }, { status: 400 });
  }

  const confirmedCount = await db.assignment.count({ where: { jobId: id, status: "CONFIRMED" } });
  if (confirmedCount === 0) {
    return NextResponse.json({ error: "This job has no confirmed workers yet." }, { status: 400 });
  }

  const updated = await db.job.update({ where: { id }, data: { status: "IN_PROGRESS" } });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_STARTED",
    targetType: "Job",
    targetId: id,
  });

  return NextResponse.json({ ok: true, job: updated });
}
