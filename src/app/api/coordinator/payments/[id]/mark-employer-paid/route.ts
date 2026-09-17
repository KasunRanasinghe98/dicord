import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guard";
import { logAudit } from "@/server/audit/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("COORDINATOR", "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  const updated = await db.payment.update({
    where: { id },
    data: { employerPaymentStatus: "PAID", employerPaidAt: new Date() },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    action: "EMPLOYER_PAYMENT_MARKED_PAID",
    targetType: "Payment",
    targetId: id,
  });

  return NextResponse.json({ ok: true, payment: updated });
}
