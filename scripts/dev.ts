import { runDevelopment } from "../lib/dev/run.ts";

process.exitCode = await runDevelopment();
