import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
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

console.log("Checked web-only routes.");
