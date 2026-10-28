#!/usr/bin/env tsx
import { checkBrandAssets, generateBrandAssets } from "./assets.ts";

const args = process.argv.slice(2);
if (args.length === 0) {
  await generateBrandAssets(process.cwd());
} else if (args.length === 1 && args[0] === "--check") {
  process.exitCode = await checkBrandAssets(process.cwd());
} else {
  console.error("Usage: quantile-brand-assets [--check]");
  process.exitCode = 2;
}
