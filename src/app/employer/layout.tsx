import { requirePageRole } from "@/server/auth/page-guard";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageRole("EMPLOYER");
  return <>{children}</>;
}
