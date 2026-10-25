import { checkBrandAssets, generateBrandAssets } from "./lib/brand/assets.ts";

const args = process.argv.slice(2);
if (args.length === 0) {
  await generateBrandAssets();
} else if (args.length === 1 && args[0] === "--check") {
  process.exitCode = await checkBrandAssets();
} else {
  console.error("Usage: pnpm run build:assets [--check]");
  process.exitCode = 2;
}
