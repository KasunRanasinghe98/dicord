import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertApplicationTransition } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

// Coordinator retracting an offer they made (distinct from the worker
// declining it themselves — same target status, different actor, logged
// separately for the audit trail).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const application = await db.application.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  try {
    assertApplicationTransition(application.status, "DECLINED");
  } catch {
    return NextResponse.json({ error: "This offer can no longer be withdrawn." }, { status: 400 });
  }

  const updated = await db.application.update({
    where: { id },
    data: { status: "DECLINED", decidedAt: new Date(), decidedByUserId: auth.session.userId },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "APPLICATION_OFFER_WITHDRAWN",
    targetType: "Application",
    targetId: id,
  });

  return NextResponse.json({ ok: true, application: updated });
}
