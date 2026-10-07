import { isEmailId } from "./delivery";

export function createEmailSender(key: string, request: typeof fetch = fetch) {
  if (!key.startsWith("re_"))
    throw new Error("Invalid Resend sending credential.");
  return async (body: string, idempotencyKey: string) => {
    try {
      const response = await request("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error("Send failed.");
      const result = await response.json();
      if (!isEmailId(result?.id)) throw new Error("Unconfirmed send.");
      return result.id;
    } catch {
      // Including 409: never change the key or acknowledge an uncertain send.
      throw new Error("Resend acceptance was not confirmed.");
    }
  };
}
