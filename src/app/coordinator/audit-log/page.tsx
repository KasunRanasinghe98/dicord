import Link from "next/link";
import { db } from "@/server/db";
import { formatStatus } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function CoordinatorAuditLogPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { phone: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit log</h1>
        <Link href="/coordinator" className="text-xs text-neutral-500 underline">
          Back to dashboard
        </Link>
      </div>
      <p className="text-sm text-neutral-500">Most recent {PAGE_SIZE} events.</p>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-neutral-100">
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {log.createdAt.toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  {log.actor ? `${log.actor.phone} (${log.actor.role})` : "System"}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{formatStatus(log.action)}</td>
                <td className="px-3 py-2 text-neutral-500">
                  {log.targetType} · {log.targetId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="p-4 text-sm text-neutral-400">No activity recorded yet.</p>
        )}
      </div>
    </main>
  );
}
