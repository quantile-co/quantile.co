import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  childEnvironment,
  type Environment,
  freePort,
  type Start,
  until,
} from "./process.ts";

export async function startEmulator({
  root,
  environment,
  start,
  signal,
}: {
  root: string;
  environment: Environment;
  start: Start;
  signal: AbortSignal;
}) {
  const port = await freePort();
  const directory = path.join(root, ".quantile", `emulator-${randomUUID()}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const config = path.join(directory, "firebase.json");
  const require = createRequire(path.join(root, "package.json"));
  await writeFile(
    config,
    JSON.stringify({
      firestore: { rules: path.join(root, "firestore.rules") },
      emulators: {
        firestore: { host: "127.0.0.1", port },
        ui: { enabled: false },
        hub: { host: "127.0.0.1", port: await freePort() },
        logging: { host: "127.0.0.1", port: await freePort() },
      },
    }),
  );
  let ready = false;
  const child = start(
    "Firestore emulator (Java 21+ required)",
    process.execPath,
    [
      require.resolve("firebase-tools/lib/bin/firebase.js"),
      "emulators:start",
      "--only",
      "firestore",
      "--project",
      "demo-quantile",
      "--config",
      config,
    ],
    {
      ...childEnvironment(environment, "tools"),
      FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
    },
    (line) => {
      if (line.includes("All emulators ready")) ready = true;
    },
  );
  const readiness = new AbortController();
  try {
    await Promise.race([
      until(
        async () => ready || undefined,
        "Firestore emulator (install Java 21+)",
        AbortSignal.any([signal, readiness.signal]),
        120_000,
      ),
      child.done.then(() => {
        throw new Error(
          "Firestore emulator exited. Install Java 21+ and ensure the emulator download is available.",
        );
      }),
    ]);
  } catch (error) {
    await child.stop();
    await rm(directory, { recursive: true, force: true });
    throw error;
  } finally {
    readiness.abort();
  }
  return {
    host: `127.0.0.1:${port}`,
    child,
    close: async () => {
      await child.stop();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
