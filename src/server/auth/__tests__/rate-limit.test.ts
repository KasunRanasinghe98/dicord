import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "@/server/auth/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit within the window, then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window elapses", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 1_000);
    expect(checkRateLimit(key, 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(checkRateLimit(key, 1, 1_000).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    checkRateLimit(keyA, 1, 60_000);
    expect(checkRateLimit(keyA, 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit(keyB, 1, 60_000).allowed).toBe(true);
  });
});
