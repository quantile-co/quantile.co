import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function filesUnder(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const routeHandlers = ["app", "src/app"]
  .flatMap(filesUnder)
  .filter((path) => /(^|\/)route\.(js|jsx|ts|tsx)$/.test(path));
const apiPages = ["pages/api", "src/pages/api"].flatMap(filesUnder);
assert.deepEqual(
  [...routeHandlers, ...apiPages],
  [],
  "Web-only revision must not expose API or webhook routes",
);

const firebase = JSON.parse(readFileSync("firebase.json", "utf8"));
const manifest = JSON.parse(readFileSync(".next/routes-manifest.json", "utf8"));
const nextHeaders = new Map(
  manifest.headers.map(({ source, headers }) => [source, headers]),
);
for (const [firebaseSource, nextSource] of [
  ["**", "/:path*"],
  ["/_next/static/**", "/_next/static/:path*"],
  ["/images/**", "/images/:path*"],
]) {
  const rule = firebase.hosting.headers.find(
    ({ source }) => source === firebaseSource,
  );
  assert.ok(rule, `Missing Firebase Hosting headers for ${firebaseSource}`);
  assert.deepEqual(
    nextHeaders.get(nextSource),
    rule.headers,
    `Next build must preserve ${firebaseSource} Hosting headers`,
  );
}

console.log("Checked web-only routes and Next/Hosting header parity.");
