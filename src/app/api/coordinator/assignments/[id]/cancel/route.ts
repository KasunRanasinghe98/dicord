import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertAssignmentTransition, assertApplicationTransition } from "@/server/jobs/state-machine";
import { syncJobHeadcountStatus } from "@/server/jobs/headcount";
import { logAudit } from "@/server/audit/log";

// Coordinator override — same effect as the worker's own cancel route, but
// no ownership check (coordinator can act on any assignment) and logged
// under a different action for the audit trail.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { id }, include: { application: true } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  try {
    assertAssignmentTransition(assignment.status, "CANCELLED");
    assertApplicationTransition(assignment.application.status, "CANCELLED");
  } catch {
    return NextResponse.json({ error: "This assignment can no longer be cancelled." }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.assignment.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.application.update({ where: { id: assignment.applicationId }, data: { status: "CANCELLED" } });
    await syncJobHeadcountStatus(tx, assignment.jobId);
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "COORDINATOR_CANCELLED_ASSIGNMENT",
    targetType: "Assignment",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
