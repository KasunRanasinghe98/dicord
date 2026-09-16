// Notification-channel abstraction for OTP delivery (blueprint §19: design
// channels so they can be added later without rewriting business logic).
// Swap SMS_PROVIDER=console for a real provider once one is contracted for
// the pilot — nothing outside this file needs to change.

export interface SmsProvider {
  send(toPhone: string, message: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(toPhone: string, message: string): Promise<void> {
    console.log(`[SMS -> ${toPhone}] ${message}`);
  }
}

function buildSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? "console";

  switch (provider) {
    case "console":
      return new ConsoleSmsProvider();
    default:
      throw new Error(
        `Unknown SMS_PROVIDER "${provider}". Only "console" is implemented so far.`,
      );
  }
}

export const smsProvider = buildSmsProvider();
