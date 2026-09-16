import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { jobInputSchema, toJobData } from "@/server/employers/job-schema";
import { logAudit } from "@/server/audit/log";

export async function POST(request: Request) {
  const auth = await requireRole("EMPLOYER");
  if ("error" in auth) return auth.error;

  const employerProfile = await db.employerProfile.findUnique({
    where: { userId: auth.session.userId },
  });
  if (!employerProfile) {
    return NextResponse.json(
      { error: "Complete your business profile before posting a job." },
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

  // New jobs always start as DRAFT — employer explicitly submits for
  // coordinator approval as a separate step (blueprint §29 journey:
  // "Create job -> Submit staffing requirement -> Coordinator approves").
  const job = await db.job.create({
    data: { ...result.value, employerId: employerProfile.id, status: "DRAFT" },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "JOB_CREATED",
    targetType: "Job",
    targetId: job.id,
  });

  return NextResponse.json({ ok: true, job });
}
