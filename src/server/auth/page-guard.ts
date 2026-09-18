import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { db } from "@/server/db";
import type { Role } from "@prisma/client";

// The Server Component / layout counterpart to requireRole() (which
// returns a NextResponse for API routes — not usable here). This is what
// closes the gap where every /coordinator page rendered its data purely on
// the strength of src/proxy.ts's redirect: that middleware is a UX
// convenience, not the authorization boundary, and until this existed, a
// bypassed or misconfigured middleware (Next.js has shipped real
// middleware-bypass bugs before) would have rendered every worker's NIC
// and phone number to an unauthenticated request. Every role-restricted
// route group's layout.tsx must call this.
export async function requirePageRole(...allowedRoles: Role[]) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { accountStatus: true },
  });
  if (!user || user.accountStatus !== "ACTIVE") redirect("/login");

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) redirect("/");

  return session;
}
