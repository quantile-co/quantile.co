import { chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, list, resume, setup } from "@quantile-co/factory-amp";
import { Command } from "commander";

const repository = "quantile-co/quantile.co";
export const cli = new Command()
  .name("site-amp")
  .description(
    "Explicit manual orb setup and connection; no automatic launch or model login.",
  );

cli.command("setup").action(() => {
  setup();
  const directory = join(
    process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
    "amp/plugins",
  );
  mkdirSync(directory, { recursive: true });
  const plugin = join(directory, "factory-orb-awake.js");
  copyFileSync(
    fileURLToPath(import.meta.resolve("@quantile-co/factory-amp/plugin")),
    plugin,
  );
  chmodSync(plugin, 0o644);
});
cli
  .command("resume")
  .requiredOption("--directory <path>", "Absolute disposable Git checkout root")
  .option("--thread <id>", "Verify the runtime Amp thread")
  .action((options: { directory: string; thread?: string }) =>
    resume({ repository, thread: options.thread }, options.directory),
  );
cli
  .command("connect")
  .requiredOption("--thread <id-or-url>", "Existing online Amp thread")
  .option("--title <text>", "Optional workspace label")
  .action((options: { thread: string; title?: string }) =>
    connect({ ...options, repository }),
  );
cli.command("list").action(() => console.log(JSON.stringify(list(), null, 2)));

if (import.meta.main) {
  try {
    await cli.parseAsync();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
