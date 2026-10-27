import { z } from "zod";

export type Environment = Record<string, string | undefined>;

// Value and ownership checks accept an explicit identity: old receipts and development
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

const developmentAccessSchema = z.object({
  STRIPE_EVENT_LIVEMODE: z.literal("false"),
  STRIPE_TEST_API_KEY: z.string().regex(/^(rk|sk)_test_/),
});
const integrationInputsSchema = developmentAccessSchema.extend({
  STRIPE_PRICE_ID: stripePriceIdSchema,
  RESEND_MANAGEMENT_API_KEY: resendKeySchema,
  RESEND_API_KEY: resendKeySchema,
  QUANTILE_EMAIL_FROM: emailAddressSchema,
  QUANTILE_EMAIL_REPLY_TO: emailAddressSchema,
});
const targetInputsSchema = developmentAccessSchema.extend({
  STRIPE_PRICE_ID: stripePriceIdSchema,
  RESEND_MANAGEMENT_API_KEY: resendKeySchema,
  STRIPE_WEBHOOK_SECRET: stripeWebhookSecretSchema,
  QUANTILE_APP_INSTANCE: appInstanceSchema,
  GCP_PROJECT_ID: z.string().min(1),
});

function requireDevelopmentAccess(env: Environment) {
  if (!developmentAccessSchema.safeParse(env).success)
    throw new Error(
      "Integration requires STRIPE_EVENT_LIVEMODE=false and STRIPE_TEST_API_KEY; production billing is forbidden.",
    );
}

export function readIntegrationSettings(env: Environment, appInstance: string) {
  parseAppInstance(appInstance);
  requireDevelopmentAccess(env);
  const parsed = integrationInputsSchema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid integration configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
    );
  return {
    stripeKey: parsed.data.STRIPE_TEST_API_KEY,
    managementKey: parsed.data.RESEND_MANAGEMENT_API_KEY,
  };
}

export function readTargetSettings(env: Environment) {
  requireDevelopmentAccess(env);
  const parsed = targetInputsSchema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Invalid target configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}.`,
    );
  return resolveFirestoreSettings({
    projectId: parsed.data.GCP_PROJECT_ID,
    emulatorHost: env.FIRESTORE_EMULATOR_HOST || undefined,
  });
}

// Next loads its own env files; capture request settings when the route runs,
// not at module import. The development launcher passes its snapshot below.
export function runtimeEnvironment(): Environment {
  return { ...process.env };
}

// Readers accept an explicit snapshot so both Next routes and the development launcher
// use the same rules without a global config object or import-time validation.
// The layout passes explicit NEXT_PUBLIC_ reads so Next freezes these optional
// settings at build time. Never fall back to a production site ID or hostname.
export function readFathomSettings(env: Environment) {
  if (env.NODE_ENV !== "production" || !env.NEXT_PUBLIC_FATHOM_SITE_ID?.trim())
    return null;
  const parsed = z
    .object({
      siteId: z.string().regex(/^[A-Z0-9]{8}$/),
      domains: z
        .array(
          z
            .string()
            .max(253)
            .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/),
        )
        .min(1),
    })
    .safeParse({
      siteId: env.NEXT_PUBLIC_FATHOM_SITE_ID.trim(),
      domains: env.NEXT_PUBLIC_FATHOM_ALLOWED_DOMAINS?.split(",").map(
        (domain) => domain.trim().toLowerCase(),
      ),
    });
  if (!parsed.success) throw new Error("Invalid Fathom configuration.");
  return { ...parsed.data, domains: [...new Set(parsed.data.domains)] };
}

// Application billing environments are independent of Next's build mode.
// Translate Stripe's livemode flag here, at the configuration boundary.
export function readBillingMode(env: Environment) {
  const livemode =
    stripeEventLivemodeSchema.parse(env.STRIPE_EVENT_LIVEMODE) === "true";
  return {
    livemode,
    mode: livemode ? ("production" as const) : ("development" as const),
  };
}

export function readStripeVerification(env: Environment) {
  return {
    ...readBillingMode(env),
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
  const { livemode, mode } = readBillingMode(env);
  const key = z.string().min(1).parse(env.STRIPE_API_KEY);
  const stripeMode = livemode ? "live" : "test";
  if (
    !key.startsWith(`rk_${stripeMode}_`) &&
    !(!livemode && key.startsWith("sk_test_"))
  )
    throw new Error("Checkout API key does not match the billing environment.");
  if (livemode && env.FIRESTORE_EMULATOR_HOST)
    throw new Error("Production billing cannot use an emulator.");
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

export function readFirestoreTarget(
  env: Environment,
  mode: "development" | "production",
) {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST || undefined;
  if (mode === "production" && emulatorHost)
    throw new Error("Production billing cannot use an emulator.");
  return resolveFirestoreSettings({
    projectId: env.GCP_PROJECT_ID ?? "",
    emulatorHost,
  });
}

// Resolve SDK connection settings here, not inside the client factory.
const firestoreTargetSchema = z.object({
  projectId: z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/),
  emulatorHost: z
    .string()
    .regex(/^(localhost|127\.0\.0\.1|\[::1\]):([0-9]{1,5})$/)
    .refine((value) => {
      const port = Number(value.slice(value.lastIndexOf(":") + 1));
      return port > 0 && port <= 65535;
    })
    .optional(),
});
export function resolveFirestoreSettings(target: {
  projectId: string;
  emulatorHost?: string;
}) {
  const result = firestoreTargetSchema.safeParse(target);
  if (!result.success)
    throw new Error(
      "Invalid Firestore target; emulators must use a loopback host and valid port.",
    );
  const { projectId, emulatorHost } = result.data;
  return {
    projectId,
    databaseId: "(default)",
    ...(emulatorHost
      ? {
          host: emulatorHost,
          ssl: false,
          clientOptions: { universeDomain: "googleapis.com" },
        }
      : {}),
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

export function readEmailSendingSettings(env: Environment) {
  return {
    key: readResendSendingKey(env),
    development: readBillingMode(env).mode === "development",
  };
}

// Launcher-discovered public URL, not user configuration or a provider secret.
export function readDevelopmentPortalUrl(env: Environment) {
  const value = env.QUANTILE_DEVELOPMENT_PORTAL_URL;
  if (value === undefined) return undefined;
  const parsed = z.string().url().safeParse(value);
  if (parsed.success && env.STRIPE_EVENT_LIVEMODE === "false") {
    const url = new URL(parsed.data);
    if (
      ["https://billing.stripe.com", "https://billing.quantile.co"].includes(
        url.origin,
      ) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/p\/login\/test_[A-Za-z0-9]+$/.test(url.pathname)
    )
      return parsed.data;
  }
  throw new Error("Invalid development billing portal URL.");
}

export function readHeaderSettings(env: Environment) {
  return {
    development: env.NODE_ENV === "development",
    cacheAssets: env.NODE_ENV === "production",
  };
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
