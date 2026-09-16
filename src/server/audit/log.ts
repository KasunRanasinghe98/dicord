import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

// Every state-changing action that matters for disputes/debugging should
// call this (blueprint §27). Deliberately fire-and-forget from the caller's
// perspective is NOT allowed — always await it so a log failure surfaces
// instead of silently vanishing.
export async function logAudit(entry: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
    },
  });
}
