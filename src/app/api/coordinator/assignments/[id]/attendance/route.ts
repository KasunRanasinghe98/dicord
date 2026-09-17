import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { logAudit } from "@/server/audit/log";

const bodySchema = z.object({ status: z.enum(["PRESENT", "LATE", "ABSENT"]) });

// Just records what happened — it does NOT cascade into Application/
// Assignment status. That finalization only happens once, atomically, at
// job completion (see .../jobs/[id]/complete), based on whatever the final
// Attendance value is. Keeping this route a pure fact-recorder avoids two
// places independently deciding "is this worker done".
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const assignment = await db.assignment.findUnique({ where: { id }, include: { attendance: true } });
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  if (assignment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Attendance can only be marked for a confirmed assignment." },
      { status: 400 },
    );
  }
  if (!assignment.attendance) {
    return NextResponse.json({ error: "No attendance record found." }, { status: 400 });
  }

  await db.attendance.update({
    where: { id: assignment.attendance.id },
    data: { status: parsed.data.status, markedByUserId: auth.session.userId, markedAt: new Date() },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "ATTENDANCE_MARKED",
    targetType: "Assignment",
    targetId: id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}
