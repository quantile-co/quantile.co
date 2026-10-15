import { belongsToAppInstance } from "../env/env";
import { isEmailId, type Mail } from "./delivery";

// One outbound boundary, including retries of stored requests. Development never
// silently rewrites a recipient: tests must enter the intended simulator email.
function assertSimulatorRequest(body: string) {
  const mail = JSON.parse(body) as Mail;
  const tags = Object.fromEntries(
    mail.tags.map(({ name, value }) => [name, value]),
  );
  const operationId = tags.quantile_operation_id;
  if (
    !belongsToAppInstance(tags.quantile_app_instance, operationId) ||
    mail.to.length !== 1 ||
    !["delivered", "bounced", "complained", "suppressed"].some(
      (kind) => mail.to[0] === `${kind}+${operationId}@resend.dev`,
    )
  )
    throw new Error(
      "Development email must use its operation's simulator address.",
    );
}

export function createEmailSender(
  { key, development }: { key: string; development: boolean },
  request: typeof fetch = fetch,
) {
  if (!key.startsWith("re_"))
    throw new Error("Invalid Resend sending credential.");
  const validate = development ? assertSimulatorRequest : (_body: string) => {};
  return async (body: string, idempotencyKey: string) => {
    try {
      validate(body);
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
