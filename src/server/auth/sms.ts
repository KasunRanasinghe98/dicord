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

// Talks to Twilio's REST API directly via fetch rather than pulling in the
// twilio npm SDK — this is a single POST request, and the SDK is a much
// heavier dependency than that warrants.
class TwilioSmsProvider implements SmsProvider {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {}

  async send(toPhone: string, message: string): Promise<void> {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const body = new URLSearchParams({ To: toPhone, From: this.fromNumber, Body: message });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );

    if (!res.ok) {
      // Twilio's error body has {code, message, more_info, status} — surface
      // the message so a trial-account "unverified number" error is
      // actually legible server-side instead of a bare "HTTP 400".
      const errorBody: unknown = await res.json().catch(() => null);
      const detail =
        errorBody && typeof errorBody === "object" && "message" in errorBody
          ? String((errorBody as { message: unknown }).message)
          : `HTTP ${res.status}`;
      throw new Error(`Twilio SMS send failed: ${detail}`);
    }
  }
}

function buildSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? "console";

  switch (provider) {
    case "console":
      return new ConsoleSmsProvider();
    case "twilio": {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      if (!accountSid || !authToken || !fromNumber) {
        throw new Error(
          "SMS_PROVIDER=twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to be set.",
        );
      }
      return new TwilioSmsProvider(accountSid, authToken, fromNumber);
    }
    default:
      throw new Error(
        `Unknown SMS_PROVIDER "${provider}". Supported values: "console", "twilio".`,
      );
  }
}

export const smsProvider = buildSmsProvider();
