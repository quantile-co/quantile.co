import "server-only";
import { Webhook } from "svix";
import {
  readAppInstance,
  readFirestoreTarget,
  readResendSigningSecret,
  readStripeEventMode,
  runtimeEnvironment,
} from "@/lib/env/env";
import { getFirestore } from "@/lib/gcp/firestore";
import { createWelcomeReceiptHandler } from "@/lib/welcome/receipt";
import { createWelcomeStore } from "@/lib/welcome/store";

export const runtime = "nodejs";
const reply = (status: number, result: string) =>
  Response.json(
    { result },
    { status, headers: { "Cache-Control": "no-store" } },
  );

async function verifiedBody(
  request: Request,
  verifier: Webhook,
): Promise<unknown> {
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };
  if (Object.values(headers).some((value) => !value))
    return reply(400, "Invalid signature");
  const reader = request.body?.getReader();
  if (!reader) return reply(400, "Invalid body");
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        return reply(413, "Body too large");
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks);
    // Svix v2 verifies unchanged bytes; it does not return parsed JSON.
    verifier.verify(raw, headers);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    return reply(400, "Invalid signature or body");
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const env = runtimeEnvironment();
    const secret = readResendSigningSecret(env);
    const payload = await verifiedBody(request, new Webhook(secret));
    if (payload instanceof Response) return payload;
    const config = {
      mode: readStripeEventMode(env).mode,
      appInstance: readAppInstance(env),
    };
    const handle = createWelcomeReceiptHandler({
      config,
      report: (reason, context) => console.info(reason, context),
      getStore: () => {
        return createWelcomeStore(
          getFirestore(readFirestoreTarget(env, config.mode)),
        );
      },
    });
    try {
      return Response.json(await handle(payload), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      console.error("resend_receipt_incomplete", {
        messageId: request.headers.get("svix-id"),
      });
      return reply(503, "Retry required");
    }
  } catch {
    console.error("resend_webhook_unavailable");
    return reply(503, "Webhook unavailable");
  }
}
