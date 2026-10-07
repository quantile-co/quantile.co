import { z } from "zod";
import { appInstanceSchema, belongsToAppInstance } from "../env/env";

const identitySchema = z.object({
  mode: z.enum(["test", "live"]),
  subscriptionId: z.string().regex(/^sub_[A-Za-z0-9_]+$/),
  invoiceId: z.string().regex(/^in_[A-Za-z0-9_]+$/),
  eventId: z.string().regex(/^evt_[A-Za-z0-9_]+$/),
  appInstance: appInstanceSchema,
  testId: z.string().optional(),
});
export type WelcomeIdentity = z.infer<typeof identitySchema>;
const emailIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
export const isEmailId = (value: unknown): value is string =>
  emailIdSchema.safeParse(value).success;
const mailSchema = z.object({
  from: z.string(),
  to: z.array(z.string()).length(1),
  reply_to: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
  tags: z.array(z.object({ name: z.string(), value: z.string() })),
});
export type Mail = z.infer<typeof mailSchema>;
const preparedSchema = identitySchema.extend({
  schema: z.literal("1"),
  request: z.string(),
  idempotencyKey: z.string(),
  createdAt: z.string().datetime(),
});
const recordSchema = z.discriminatedUnion("state", [
  preparedSchema.extend({
    state: z.literal("pending"),
    resendId: z.never().optional(),
    acceptedAt: z.never().optional(),
    callbackReceivedAt: z.never().optional(),
  }),
  preparedSchema.extend({
    state: z.literal("accepted"),
    resendId: emailIdSchema,
    acceptedAt: z.string().datetime(),
    callbackReceivedAt: z.string().datetime().optional(),
  }),
]);
// Keep the exact provider request immutable, not an event to re-render later.
export type WelcomeRecord = z.infer<typeof recordSchema>;
export type WelcomeStore = {
  get: (
    identity: Pick<WelcomeIdentity, "mode" | "subscriptionId">,
  ) => Promise<WelcomeRecord | null>;
  prepare: (candidate: WelcomeRecord) => Promise<WelcomeRecord>;
  accept: (
    identity: WelcomeIdentity,
    resendId: string,
    source?: "api" | "webhook",
  ) => Promise<WelcomeRecord>;
};
export function assertOwnership(
  record: WelcomeIdentity,
  expected: WelcomeIdentity,
) {
  if (
    record.mode !== expected.mode ||
    record.subscriptionId !== expected.subscriptionId ||
    record.invoiceId !== expected.invoiceId ||
    record.appInstance !== expected.appInstance ||
    (record.mode === "test" &&
      (!belongsToAppInstance(expected.appInstance, expected.testId) ||
        record.testId !== expected.testId))
  )
    throw new Error("Welcome record belongs to a different operation.");
}
export function assertRecord(value: WelcomeRecord): void {
  if (
    !recordSchema.safeParse(value).success ||
    value.idempotencyKey !== `welcome/${value.mode}/${value.subscriptionId}`
  )
    throw new Error("Invalid welcome record.");
  assertOwnership(value, value);
  let decoded: unknown;
  try {
    decoded = JSON.parse(value.request);
  } catch {
    throw new Error("Invalid stored email request.");
  }
  const parsed = mailSchema.safeParse(decoded);
  if (!parsed.success) throw new Error("Invalid stored email request.");
  const mail = parsed.data;
  if (
    !welcomeTags(value).every(
      (tag) =>
        mail.tags.filter(
          (stored) => stored.name === tag.name && stored.value === tag.value,
        ).length === 1,
    )
  )
    throw new Error("Invalid stored email correlation.");
  if (
    value.mode === "test" &&
    mail.to[0] !== "suppressed@resend.dev" &&
    !["delivered", "bounced", "complained"].some(
      (kind) => mail.to[0] === `${kind}+${value.testId}@resend.dev`,
    )
  )
    throw new Error("Test email must use its operation's simulator address.");
}
export function welcomeTags(identity: WelcomeIdentity): Mail["tags"] {
  return [
    { name: "quantile_operation", value: "welcome" },
    { name: "stripe_mode", value: identity.mode },
    { name: "stripe_subscription_id", value: identity.subscriptionId },
    { name: "stripe_invoice_id", value: identity.invoiceId },
    { name: "quantile_app_instance", value: identity.appInstance },
    ...(identity.testId
      ? [{ name: "quantile_test_id", value: identity.testId }]
      : []),
  ];
}
export function createWelcomeDelivery({
  store,
  send,
}: {
  store: WelcomeStore;
  send: (request: string, idempotencyKey: string) => Promise<string>;
}) {
  return async (
    identity: WelcomeIdentity,
    render: () => Promise<Omit<Mail, "tags">>,
  ) => {
    let record = await store.get(identity);
    if (!record) {
      const mail = { ...(await render()), tags: welcomeTags(identity) };
      record = await store.prepare({
        ...identity,
        schema: "1",
        request: JSON.stringify(mail),
        idempotencyKey: `welcome/${identity.mode}/${identity.subscriptionId}`,
        createdAt: new Date().toISOString(),
        state: "pending",
      });
    }
    assertRecord(record);
    assertOwnership(record, identity);
    if (record.state === "accepted") return record;
    const resendId = await send(record.request, record.idempotencyKey);
    if (!isEmailId(resendId))
      throw new Error("Resend acceptance was not confirmed.");
    const accepted = await store.accept(identity, resendId);
    assertRecord(accepted);
    assertOwnership(accepted, identity);
    if (accepted.state !== "accepted" || accepted.resendId !== resendId)
      throw new Error("Welcome completion was not confirmed.");
    return accepted;
  };
}
