import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/server/auth/session";
import type { Role } from "@prisma/client";

// Every protected API route must call this — never rely on the frontend
// hiding a button (blueprint §26).
export async function requireRole(
  ...allowedRoles: Role[]
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return { error: NextResponse.json({ error: "Not authorized." }, { status: 403 }) };
  }

  return { session };
}
