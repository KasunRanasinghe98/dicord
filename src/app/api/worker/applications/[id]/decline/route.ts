import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertApplicationTransition } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("WORKER");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: { worker: { select: { userId: true } } },
  });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.worker.userId !== auth.session.userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    assertApplicationTransition(application.status, "DECLINED");
  } catch {
    return NextResponse.json({ error: "This offer can no longer be declined." }, { status: 400 });
  }

  const updated = await db.application.update({
    where: { id },
    data: { status: "DECLINED", decidedAt: new Date() },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "APPLICATION_DECLINED_BY_WORKER",
    targetType: "Application",
    targetId: id,
  });

  return NextResponse.json({ ok: true, application: updated });
}
