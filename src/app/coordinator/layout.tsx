import { requirePageRole } from "@/server/auth/page-guard";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole("COORDINATOR", "ADMIN");
  return <>{children}</>;
}
