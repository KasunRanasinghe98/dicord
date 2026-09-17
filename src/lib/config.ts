// Blueprint §18: "Do not hard-code Rs. 300. Make the platform fee
// configurable." Read once per call rather than cached, so changing the
// env var takes effect without a restart in dev.
export function getPlatformFeePerWorker(): string {
  return process.env.PLATFORM_FEE_PER_WORKER ?? "300.00";
}
