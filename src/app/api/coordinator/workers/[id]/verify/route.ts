import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { logAudit } from "@/server/audit/log";

const bodySchema = z.object({ status: z.enum(["VERIFIED", "REJECTED"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const profile = await db.workerProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "Worker not found." }, { status: 404 });

  const updated = await db.workerProfile.update({
    where: { id },
    data: {
      verificationStatus: parsed.data.status,
      verifiedAt: new Date(),
      verifiedByUserId: auth.session.userId,
    },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: parsed.data.status === "VERIFIED" ? "WORKER_VERIFIED" : "WORKER_REJECTED",
    targetType: "WorkerProfile",
    targetId: id,
  });

  return NextResponse.json({ ok: true, profile: updated });
}
