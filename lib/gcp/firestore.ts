import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";

const firestoreConfigSchema = z.object({
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
export type FirestoreConfig = z.infer<typeof firestoreConfigSchema>;

export function validateFirestoreConfig(
  config: FirestoreConfig,
): FirestoreConfig {
  const result = firestoreConfigSchema.safeParse(config);
  if (!result.success)
    throw new Error(
      "Invalid Firestore target; emulators must use a loopback host and valid port.",
    );
  return result.data;
}

// Shared (default) database; constructing a client does not provision anything.
// Roots must pass the ambient emulator setting too: the SDK also recognizes it.
const clients = new Map<string, Firestore>();
export function getFirestore(config: FirestoreConfig): Firestore {
  const { projectId, emulatorHost } = validateFirestoreConfig(config);
  const key = JSON.stringify([projectId, emulatorHost ?? null]);
  let client = clients.get(key);
  if (!client) {
    client = new Firestore({
      projectId,
      databaseId: "(default)",
      ...(emulatorHost
        ? {
            host: emulatorHost,
            ssl: false,
            // Avoid an ADC/metadata probe solely for emulator universe discovery.
            clientOptions: { universeDomain: "googleapis.com" },
          }
        : {}),
    });
    clients.set(key, client);
  }
  return client;
}
