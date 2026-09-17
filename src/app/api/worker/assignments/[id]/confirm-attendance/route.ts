import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { logAudit } from "@/server/audit/log";

// Blueprint §15: the worker's pre-shift "I will attend" tap. This is
// distinct from the coordinator's day-of PRESENT/LATE/ABSENT mark — it's
// just an earlier intent signal, recorded on the same Attendance row.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { id },
    include: { worker: { select: { userId: true } }, attendance: true },
  });
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  if (assignment.worker.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // §28: "A worker cannot confirm attendance for a cancelled assignment."
  if (assignment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "This assignment is no longer active." },
      { status: 400 },
    );
  }
  if (!assignment.attendance || assignment.attendance.status !== "PENDING") {
    return NextResponse.json(
      { error: "Attendance for this assignment has already been recorded." },
      { status: 400 },
    );
  }

  await db.attendance.update({
    where: { id: assignment.attendance.id },
    data: { status: "WORKER_CONFIRMED", workerConfirmedAt: new Date() },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "WORKER_CONFIRMED_ATTENDANCE",
    targetType: "Assignment",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
