import { env } from "../config/env";

/**
 * Sends the OTP by SMS.
 * - Development: no SMS is sent, the OTP is printed in the backend terminal.
 * - Production: uses Fast2SMS (set FAST2SMS_API_KEY). To use another provider (MSG91, Twilio),
 *   replace the fetch call below. Check your provider's current API docs and DLT rules for India.
 */
export async function sendOtpSms(phone: string, otp: string) {
  if (env.NODE_ENV !== "production") {
    console.log(`[DEV SMS] Password reset OTP for ${phone}: ${otp}`);
    return;
  }
  if (!env.FAST2SMS_API_KEY) throw new Error("FAST2SMS_API_KEY is not set");
  const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: { authorization: env.FAST2SMS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ route: "otp", variables_values: otp, numbers: phone }),
  });
  if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
}
