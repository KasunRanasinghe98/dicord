import { describe, expect, it } from "vitest";
import { normalizeNic } from "@/lib/nic";

describe("normalizeNic", () => {
  it("accepts the old 9-digit + V/X format and uppercases the suffix", () => {
    expect(normalizeNic("912345678v")).toBe("912345678V");
    expect(normalizeNic("912345678X")).toBe("912345678X");
  });

  it("accepts the new 12-digit-only format", () => {
    expect(normalizeNic("199212345678")).toBe("199212345678");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeNic("  912345678v  ")).toBe("912345678V");
  });

  it("rejects anything else", () => {
    expect(() => normalizeNic("12345")).toThrow();
    expect(() => normalizeNic("912345678A")).toThrow(); // wrong suffix letter
    expect(() => normalizeNic("1992123456789")).toThrow(); // 13 digits
    expect(() => normalizeNic("")).toThrow();
  });
});
