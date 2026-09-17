import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { assertJobTransition } from "@/server/jobs/state-machine";
import { logAudit } from "@/server/audit/log";

const bodySchema = z.object({ reason: z.string().trim().optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

  // Deliberately narrower than assertJobTransition() alone would allow:
  // CANCELLED is reachable from most non-terminal statuses (e.g. an
  // already-OPEN job being pulled), but "reject" specifically means
  // declining a pending submission, not cancelling a live job.
  if (job.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Only jobs pending approval can be rejected." },
      { status: 400 },
    );
  }
  assertJobTransition(job.status, "CANCELLED");

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const reason = parsed.success ? parsed.data.reason : undefined;

  const updated = await db.job.update({
    where: { id },
    data: {
      status: "CANCELLED",
      coordinatorNotes: reason
        ? `Rejected: ${reason}`
        : "Rejected by coordinator (no reason given).",
    },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_REJECTED",
    targetType: "Job",
    targetId: id,
    metadata: reason ? { reason } : undefined,
  });

  return NextResponse.json({ ok: true, job: updated });
}
