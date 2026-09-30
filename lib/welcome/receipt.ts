import { belongsToAppInstance } from "@/lib/app/instance";
import {
  assertOwnership,
  assertRecord,
  isEmailId,
  type Mail,
  type WelcomeStore,
  welcomeTags,
} from "./delivery";

// The Resend transport verifies the signature before invoking this action.
export function createWelcomeReceiptHandler({
  config,
  getStore,
  report = () => {},
}: {
  config: { mode: "test" | "live"; appInstance: string };
  getStore: () => WelcomeStore;
  report?: (reason: string, context: Record<string, string>) => void;
}) {
  const { mode, appInstance } = config;
  return async (event: unknown) => {
    const payload = event as {
      type?: string;
      data?: {
        email_id?: unknown;
        tags?: Record<string, string>;
        from?: string;
        to?: string[];
        subject?: string;
      };
    } | null;
    const data = payload?.data;
    const tags = data?.tags;
    if (
      payload?.type !== "email.sent" ||
      tags?.quantile_operation !== "welcome" ||
      tags.stripe_mode !== mode ||
      tags.quantile_app_instance !== appInstance
    )
      return { result: "ignored" };
    if (
      !data ||
      !isEmailId(data.email_id) ||
      !/^sub_[A-Za-z0-9_]+$/.test(tags.stripe_subscription_id ?? "") ||
      !/^in_[A-Za-z0-9_]+$/.test(tags.stripe_invoice_id ?? "") ||
      (mode === "test" &&
        !belongsToAppInstance(appInstance, tags.quantile_test_id))
    )
      throw new Error("Invalid welcome receipt.");
    const store = getStore();
    const identity = {
      mode,
      subscriptionId: tags.stripe_subscription_id,
    } as const;
    const record = await store.get(identity);
    // Never create a delivery record from an email callback. It must already
    // have been prepared by a verified, eligible Stripe invoice.
    if (!record) throw new Error("Welcome record not found.");
    assertRecord(record);
    assertOwnership(record, {
      ...identity,
      invoiceId: tags.stripe_invoice_id,
      eventId: record.eventId,
      appInstance,
      ...(mode === "test" ? { testId: tags.quantile_test_id } : {}),
    });
    const mail = JSON.parse(record.request) as Mail;
    if (
      data.from !== mail.from ||
      data.subject !== mail.subject ||
      !Array.isArray(data.to) ||
      data.to.length !== 1 ||
      data.to[0] !== mail.to[0] ||
      !welcomeTags(record).every((tag) => tags[tag.name] === tag.value)
    )
      throw new Error("Receipt does not match the prepared email.");
    const saved = await store.accept(record, data.email_id, "webhook");
    if (
      saved.state !== "accepted" ||
      saved.resendId !== data.email_id ||
      !saved.callbackReceivedAt
    )
      throw new Error("Welcome receipt was not confirmed.");
    report("welcome_receipt_recorded", {
      subscriptionId: record.subscriptionId,
      invoiceId: record.invoiceId,
      appInstance,
      mode,
      resendId: saved.resendId,
    });
    return {
      result: "completed",
      subscriptionId: record.subscriptionId,
      resendId: saved.resendId,
    };
  };
}
