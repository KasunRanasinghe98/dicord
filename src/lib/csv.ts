// Free-text comma-separated inputs (e.g. "Colombo, Kandy") are the fastest
// way to collect list fields on a small mobile form (blueprint §33:
// "minimal form fields") without building a tag picker.
export function parseCsvList(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
