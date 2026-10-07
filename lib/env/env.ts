import { z } from "zod";

export type Environment = Record<string, string | undefined>;

// Value and ownership checks accept an explicit identity: old receipts and local
// cleanup must not be reinterpreted using the current process environment.
export const appInstanceSchema = z
  .string()
  .regex(/^[a-z](?:[a-z0-9-]{0,18}[a-z0-9])?$/);

export function parseAppInstance(value: unknown): string {
  const parsed = appInstanceSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Invalid app instance. Use 1–20 lowercase characters, starting with a letter and ending with a letter or number.",
    );
  return parsed.data;
}

export function belongsToAppInstance(
  appInstance: string,
  operationId: string | undefined,
): operationId is string {
  return (
    appInstanceSchema.safeParse(appInstance).success &&
    Boolean(operationId?.startsWith(`${appInstance}-`)) &&
    /^[a-f0-9]{32}$/.test(operationId?.slice(appInstance.length + 1) ?? "")
  );
}

const stripeEventLivemodeSchema = z.enum(["true", "false"]);
const stripePriceIdSchema = z.string().regex(/^price_[A-Za-z0-9_]+$/);
const stripeWebhookSecretSchema = z.string().startsWith("whsec_");
const resendKeySchema = z.string().startsWith("re_").min(4);
const emailAddressSchema = z.string().min(1);

const testAccessSchema = z.object({
  STRIPE_EVENT_LIVEMODE: z.literal("false"),
  STRIPE_TEST_API_KEY: z.string().regex(/^(rk|sk)_test_/),
});
const integrationInputsSchema = testAccessSchema.extend({
  STRIPE_PRICE_ID: stripePriceIdSchema,
  RESEND_MANAGEMENT_API_KEY: resendKeySchema,
  RESEND_API_KEY: resendKeySchema,
  QUANTILE_EMAIL_FROM: emailAddressSchema,
  QUANTILE_EMAIL_REPLY_TO: emailAddressSchema,
});
const targetInputsSchema = testAccessSchema.extend({
  STRIPE_PRICE_ID: stripePriceIdSchema,
  RESEND_MANAGEMENT_API_KEY: resendKeySchema,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecretSchema,
  QUANTILE_APP_INSTANCE: appInstanceSchema,
  GCP_PROJECT_ID: z.string().min(1),
});

function requireTestAccess(env: Environment) {
  if (!testAccessSchema.safeParse(env).success)
    throw new Error(
      "Integration requires STRIPE_EVENT_LIVEMODE=false and STRIPE_TEST_API_KEY; live mode is forbidden.",
    );
}

export function readIntegrationSettings(env: Environment, appInstance: string) {
  parseAppInstance(appInstance);
  requireTestAccess(env);
  const parsed = integrationInputsSchema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid integration configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
    );
  let origin: string | undefined;
  if (env.NGROK_URL) {
    let url: URL;
    try {
      url = new URL(env.NGROK_URL.replaceAll("{appInstance}", appInstance));
    } catch {
      throw new Error("Invalid ngrok origin.");
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error(
        "NGROK_URL must be a reserved public HTTPS origin, unique to this app instance.",
      );
    origin = url.origin;
  }
  return {
    origin,
    stripeKey: parsed.data.STRIPE_TEST_API_KEY,
    managementKey: parsed.data.RESEND_MANAGEMENT_API_KEY,
  };
}

export function readTargetSettings(env: Environment) {
  requireTestAccess(env);
  const parsed = targetInputsSchema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid target configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
    );
  return {
    projectId: parsed.data.GCP_PROJECT_ID,
    emulatorHost: env.FIRESTORE_EMULATOR_HOST || undefined,
  };
}

// Next loads its own env files; capture request settings when the route runs,
// not at module import. Local dev passes its separately loaded snapshot below.
export function runtimeEnvironment(): Environment {
  return { ...process.env };
}

// Readers accept an explicit snapshot so both Next routes and the local launcher
// use the same rules without a global config object or import-time validation.
export function readStripeEventMode(env: Environment) {
  const livemode =
    stripeEventLivemodeSchema.parse(env.STRIPE_EVENT_LIVEMODE) === "true";
  return { livemode, mode: livemode ? ("live" as const) : ("test" as const) };
}

export function readStripeVerification(env: Environment) {
  return {
    ...readStripeEventMode(env),
    signingSecret: stripeWebhookSecretSchema.parse(env.STRIPE_WEBHOOK_SECRET),
  };
}

export function readResendSigningSecret(env: Environment) {
  return stripeWebhookSecretSchema.parse(env.RESEND_WEBHOOK_SECRET);
}

export function readAppInstance(env: Environment) {
  return parseAppInstance(env.QUANTILE_APP_INSTANCE);
}

export function readStripePriceId(env: Environment) {
  return stripePriceIdSchema.parse(env.STRIPE_PRICE_ID);
}

// Only a visitor starting Checkout needs the API key. A build, homepage view or
// incoming webhook never does. The key and selected Price must target one account.
export function readCheckoutSettings(env: Environment) {
  const { livemode, mode } = readStripeEventMode(env);
  const key = z.string().min(1).parse(env.STRIPE_API_KEY);
  if (
    !key.startsWith(`rk_${mode}_`) &&
    !(mode === "test" && key.startsWith("sk_test_"))
  )
    throw new Error("Checkout API key does not match Stripe mode.");
  if (livemode && env.FIRESTORE_EMULATOR_HOST)
    throw new Error("Live billing cannot use an emulator.");
  const origin = z.string().url().parse(env.QUANTILE_SITE_ORIGIN);
  const url = new URL(origin);
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        !livemode &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.origin !== origin
  )
    throw new Error("Invalid Checkout return origin.");
  return {
    key,
    livemode,
    mode,
    origin,
    priceId: readStripePriceId(env),
    appInstance: readAppInstance(env),
  };
}

export function readFirestoreTarget(env: Environment, mode: "test" | "live") {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST || undefined;
  if (mode === "live" && emulatorHost)
    throw new Error("Live billing cannot use an emulator.");
  return {
    projectId: z.string().min(1).parse(env.GCP_PROJECT_ID),
    emulatorHost,
  };
}

export function readEmailAddresses(env: Environment) {
  return {
    from: emailAddressSchema.parse(env.QUANTILE_EMAIL_FROM),
    replyTo: emailAddressSchema.parse(env.QUANTILE_EMAIL_REPLY_TO),
  };
}

export function readResendSendingKey(env: Environment) {
  return z.string().min(1).parse(env.RESEND_API_KEY);
}

// Only the non-Next CLI calls this after parsing its command. Next itself loads
// env files for route handlers; importing this module never loads files/secrets.
export async function loadDevelopmentEnvironment(
  root: string,
  nodeEnv: "test" | "development",
): Promise<Environment> {
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(root, true, {
    info() {},
    error() {
      throw new Error("Could not load environment files.");
    },
  });
  return { ...process.env };
}
