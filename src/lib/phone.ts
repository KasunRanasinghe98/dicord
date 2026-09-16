// Normalizes Sri Lankan phone numbers to a consistent E.164-ish key
// (+94XXXXXXXXX) so the same number always maps to the same User row
// regardless of whether it was typed as 0771234567, 771234567 or
// +94771234567.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");

  if (digits.startsWith("94") && digits.length === 11) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+94${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+94${digits}`;
  }

  throw new Error("Enter a valid Sri Lankan phone number.");
}
