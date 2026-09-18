import { requirePageRole } from "@/server/auth/page-guard";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole("WORKER");
  return <>{children}</>;
}
