import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const role = params.role === "EMPLOYER" ? "EMPLOYER" : "WORKER";
  const initialMode = params.mode === "login" ? "login" : "register";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <LoginForm initialRole={role} initialMode={initialMode} />
    </main>
  );
}
