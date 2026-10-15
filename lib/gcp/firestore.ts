import { Firestore, type Settings } from "@google-cloud/firestore";

// Reuse clients for identical, validated connection settings.
const clients = new Map<string, Firestore>();

export function getFirestore(settings: Settings): Firestore {
  const key = JSON.stringify(settings);
  let client = clients.get(key);
  if (!client) {
    client = new Firestore(settings);
    clients.set(key, client);
  }
  return client;
}
