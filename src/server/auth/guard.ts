import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/server/auth/session";
import { db } from "@/server/db";
import type { Role } from "@prisma/client";

// Every protected API route must call this — never rely on the frontend
// hiding a button (blueprint §26).
//
// This re-checks the user's current accountStatus in the DB on every call
// rather than trusting the JWT claim alone. The session cookie lives for 30
// days with no revocation list, so without this check, suspending or
// banning a user (or changing their role) would have zero effect until
// their existing cookie happened to expire.
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { accountStatus: true },
  });
  if (!user || user.accountStatus !== "ACTIVE") {
    return { error: NextResponse.json({ error: "Account is not active." }, { status: 403 }) };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }

  return { session };
}
