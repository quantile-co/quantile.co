import { runDevelopment } from "../../lib/dev/run.ts";

process.exitCode = await runDevelopment(process.argv.slice(2));
