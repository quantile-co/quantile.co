import type { DocumentSnapshot, Firestore } from "@google-cloud/firestore";
import {
  assertOwnership,
  assertRecord,
  isEmailId,
  type WelcomeIdentity,
  type WelcomeRecord,
  type WelcomeStore,
} from "./delivery";

// Bound the caller's wait. An issued SDK write may still finish after a timeout;
// that is ambiguous, not a failed write, and must never trigger an early ACK.
async function bounded<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Firestore deadline exceeded.")),
          3000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
const code = (error: unknown) => Number((error as { code?: number })?.code);

export function createWelcomeStore(
  client: Pick<Firestore, "doc">,
): WelcomeStore {
  const document = (
    identity: Pick<WelcomeIdentity, "mode" | "subscriptionId">,
  ) => {
    if (
      !["test", "live"].includes(identity.mode) ||
      !/^sub_[A-Za-z0-9_]+$/.test(identity.subscriptionId)
    )
      throw new Error("Invalid welcome identity.");
    return client.doc(
      `welcome-emails/${identity.mode}-${identity.subscriptionId}`,
    );
  };
  async function load(
    identity: Pick<WelcomeIdentity, "mode" | "subscriptionId">,
  ) {
    let snapshot: DocumentSnapshot;
    try {
      snapshot = await bounded(document(identity).get());
    } catch {
      throw new Error("Could not read welcome record.");
    }
    if (!snapshot.exists) return null;
    const record = snapshot.data() as WelcomeRecord;
    assertRecord(record);
    if (!snapshot.updateTime) throw new Error("Invalid welcome record.");
    return { record, updateTime: snapshot.updateTime };
  }
  return {
    get: async (identity) => (await load(identity))?.record ?? null,
    async prepare(candidate) {
      assertRecord(candidate);
      if (candidate.state !== "pending")
        throw new Error("New records must be pending.");
      try {
        await bounded(
          document(candidate).create(
            Object.fromEntries(
              Object.entries(candidate).filter(
                ([, value]) => value !== undefined,
              ),
            ),
          ),
        );
      } catch (error) {
        // create() uses an exists=false precondition. Only an already-existing
        // document is a competing winner; other outcomes remain uncertain.
        if (code(error) !== 6)
          throw new Error("Could not prepare welcome record.");
      }
      const saved = (await load(candidate))?.record;
      if (!saved) throw new Error("Welcome request was not confirmed.");
      assertOwnership(saved, candidate);
      // A competing renderer may win with a different body. Reuse that body.
      return saved;
    },
    async accept(identity, resendId, source = "api") {
      if (!isEmailId(resendId)) throw new Error("Invalid Resend receipt.");
      const current = await load(identity);
      if (!current) throw new Error("Welcome record not found.");
      assertOwnership(current.record, identity);
      if (current.record.state === "accepted") {
        if (current.record.resendId !== resendId)
          throw new Error("Conflicting welcome receipt.");
        if (source === "api" || current.record.callbackReceivedAt)
          return current.record;
      }
      try {
        // SDK update() uses Commit + an update mask and timestamp precondition.
        // Never put email sending inside a retried database transaction.
        await bounded(
          document(identity).update(
            {
              state: "accepted",
              resendId,
              acceptedAt: current.record.acceptedAt ?? new Date().toISOString(),
              ...(source === "webhook"
                ? { callbackReceivedAt: new Date().toISOString() }
                : {}),
            },
            { lastUpdateTime: current.updateTime },
          ),
        );
      } catch (error) {
        if (![9, 10].includes(code(error)))
          throw new Error("Could not record welcome acceptance.");
        // A CAS loser can succeed only after reading matching durable evidence.
      }
      const saved = (await load(identity))?.record;
      if (!saved) throw new Error("Welcome record disappeared.");
      assertOwnership(saved, identity);
      if (
        saved.state !== "accepted" ||
        saved.resendId !== resendId ||
        (source === "webhook" && !saved.callbackReceivedAt)
      )
        throw new Error("Welcome receipt was not confirmed.");
      return saved;
    },
  };
}
