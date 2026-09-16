"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";
type Role = "WORKER" | "EMPLOYER";
type Step = "phone" | "code";

export function LoginForm({
  initialRole,
  initialMode,
}: {
  initialRole: Role;
  initialMode: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const purpose = mode === "register" ? "REGISTER" : "LOGIN";

  async function sendCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not send code.");
      }
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          purpose,
          code,
          ...(mode === "register" ? { role } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Could not verify code.");
      }
      const destinationRole = body.user?.role ?? role;
      router.push(destinationRole === "EMPLOYER" ? "/employer" : "/worker");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">
          {mode === "register" ? "Create your account" : "Log in"}
        </h1>
        <p className="text-sm text-neutral-500">
          {step === "phone"
            ? "We'll text you a one-time code."
            : `Enter the code sent to ${phone}.`}
        </p>
      </div>

      {mode === "register" && step === "phone" && (
        <div className="flex gap-2">
          {(["WORKER", "EMPLOYER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                role === r
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {r === "WORKER" ? "I'm a worker" : "I'm an employer"}
            </button>
          ))}
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <input
            type="tel"
            inputMode="tel"
            placeholder="07X XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading || phone.length < 9}
            onClick={sendCode}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send code"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-center text-lg tracking-widest"
          />
          <button
            type="button"
            disabled={loading || code.length !== 6}
            onClick={verifyCode}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-center text-xs text-neutral-500 underline"
          >
            Use a different number
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setStep("phone");
          setError(null);
        }}
        className="w-full text-center text-xs text-neutral-500 underline"
      >
        {mode === "register"
          ? "Already have an account? Log in"
          : "New here? Create an account"}
      </button>
    </div>
  );
}
