// Sri Lankan National Identity Card number — the anchor that stops one
// person registering as multiple workers under different phone numbers.
// Two valid formats are in circulation: the old 9-digit + V/X suffix
// (issued before ~2016) and the new 12-digit-only format, so both are
// accepted rather than forcing older workers to have a new-format card.
const OLD_FORMAT = /^[0-9]{9}[VX]$/;
const NEW_FORMAT = /^[0-9]{12}$/;

export function normalizeNic(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (OLD_FORMAT.test(normalized) || NEW_FORMAT.test(normalized)) {
    return normalized;
  }
  throw new Error("Enter a valid NIC number (e.g. 912345678V or 199212345678).");
}
