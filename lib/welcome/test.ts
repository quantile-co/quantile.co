import { vi } from "vitest";

const testId = "sample-00000000000000000000000000000001";
const config = {
  appInstance: "sample",
  from: "Quantile <welcome@example.com>",
  replyTo: "help@example.com",
};

import {
  assertOwnership,
  assertRecord,
  isEmailId,
  type Mail,
  type WelcomeIdentity,
  type WelcomeRecord,
  welcomeTags,
} from "./delivery";

export function pending(
  overrides: Partial<WelcomeIdentity> = {},
  mailOverrides: Partial<Mail> = {},
): WelcomeRecord {
  const identity: WelcomeIdentity = {
    mode: "test",
    appInstance: config.appInstance,
    testId,
    eventId: "evt_local_payment",
    invoiceId: "in_local_first_payment",
    subscriptionId: "sub_local_customer",
    ...overrides,
  };
  return {
    ...identity,
    schema: "1",
    state: "pending",
    createdAt: new Date().toISOString(),
    idempotencyKey: `welcome/${identity.mode}/${identity.subscriptionId}`,
    request: JSON.stringify({
      from: config.from,
      reply_to: config.replyTo,
      to: [`delivered+${identity.testId}@resend.dev`],
      subject: "[Test] Welcome to Quantile",
      html: "<p>Welcome</p>",
      text: "Welcome",
      tags: welcomeTags(identity),
      ...mailOverrides,
    }),
  };
}

export function memoryStore() {
  const records = new Map<string, WelcomeRecord>();
  const key = (identity: Pick<WelcomeIdentity, "mode" | "subscriptionId">) =>
    `${identity.mode}-${identity.subscriptionId}`;
  return {
    records,
    get: vi.fn(
      async (identity: Pick<WelcomeIdentity, "mode" | "subscriptionId">) =>
        structuredClone(records.get(key(identity)) ?? null),
    ),
    prepare: vi.fn(async (record: WelcomeRecord) => {
      assertRecord(record);
      if (record.state !== "pending")
        throw new Error("New records must be pending.");
      const saved = records.get(key(record)) ?? structuredClone(record);
      assertOwnership(saved, record);
      records.set(key(record), saved);
      return structuredClone(saved);
    }),
    accept: vi.fn(
      async (
        identity: WelcomeIdentity,
        resendId: string,
        source: "api" | "webhook" = "api",
      ) => {
        if (!isEmailId(resendId)) throw new Error("Invalid Resend receipt.");
        const current = records.get(key(identity));
        if (!current) throw new Error("Missing record");
        assertRecord(current);
        assertOwnership(current, identity);
        if (current.resendId && current.resendId !== resendId)
          throw new Error("Conflicting receipt");
        const saved: WelcomeRecord = {
          ...current,
          state: "accepted",
          resendId,
          acceptedAt: current.acceptedAt ?? new Date().toISOString(),
          ...(source === "webhook"
            ? {
                callbackReceivedAt:
                  current.callbackReceivedAt ?? new Date().toISOString(),
              }
            : {}),
        };
        records.set(key(identity), saved);
        return structuredClone(saved);
      },
    ),
  };
}

export function receipt(
  record: WelcomeRecord = pending(),
  resendId = "mail_accepted",
) {
  const mail = JSON.parse(record.request) as Mail;
  return {
    type: "email.sent",
    data: {
      email_id: resendId,
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      tags: Object.fromEntries(mail.tags.map((tag) => [tag.name, tag.value])),
    },
  };
}
