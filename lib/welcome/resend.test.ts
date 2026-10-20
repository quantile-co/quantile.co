import { describe, expect, it, vi } from "vitest";
import { createEmailSender } from "./resend";
import { pending } from "./test";

describe("email sending boundary", () => {
  it.each(["delivered", "bounced", "complained", "suppressed"])(
    "allows the operation's %s simulator",
    async (kind) => {
      const record = pending();
      const body = JSON.parse(record.request);
      body.to = [`${kind}+${record.operationId}@resend.dev`];
      const request = vi.fn(async () => Response.json({ id: "mail_accepted" }));
      const send = createEmailSender(
        { key: "re_fixture", development: true },
        request,
      );
      expect(await send(JSON.stringify(body), record.idempotencyKey)).toBe(
        "mail_accepted",
      );
      expect(request).toHaveBeenCalledOnce();
    },
  );
  it.each([
    ["customer@example.com"],
    ["delivered@resend.dev"],
    ["delivered+other-00000000000000000000000000000001@resend.dev"],
    ["delivered@resend.dev.attacker.example"],
    [],
    ["suppressed@resend.dev", "customer@example.com"],
  ])(
    "blocks unsafe stored recipients before any provider call: %j",
    async (...to) => {
      const record = pending({}, { to });
      const request = vi.fn();
      const send = createEmailSender(
        { key: "re_fixture", development: true },
        request,
      );
      await expect(send(record.request, record.idempotencyKey)).rejects.toThrow(
        "acceptance was not confirmed",
      );
      expect(request).not.toHaveBeenCalled();
    },
  );
  it("sends the same immutable request and idempotency key for a customer", async () => {
    const record = pending(
      { mode: "production" },
      { to: ["customer@example.com"] },
    );
    const request = vi.fn(async () => Response.json({ id: "mail_accepted" }));
    const send = createEmailSender(
      { key: "re_fixture", development: false },
      request,
    );
    expect(await send(record.request, record.idempotencyKey)).toBe(
      "mail_accepted",
    );
    expect(request).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        body: record.request,
        headers: expect.objectContaining({
          "Idempotency-Key": record.idempotencyKey,
        }),
      }),
    );
  });
});
