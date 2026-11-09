import { execFileSync, spawnSync } from "node:child_process";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
function run(
  command: string,
  args: string[] = [],
  extra: NodeJS.ProcessEnv = {},
) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...extra },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.signal) {
    process.kill(process.pid, result.signal);
    throw new Error("Interrupted");
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const [action, ...args] = process.argv.slice(2);
if (args.length) throw new Error("Unexpected repository task arguments");
switch (action) {
  case "check":
    run("factory-files", ["check"]);
    run("nix", ["flake", "check", "."]);
    for (const command of [
      "check-git-hooks",
      "check-nixfmt",
      "check-deadnix",
      "check-statix",
      "check-editorconfig",
    ])
      run(command);
    for (const command of ["check-shellcheck", "check-shfmt"])
      run(command, [".", ":(exclude,glob).pi/skills/**"]);
    run("check-markdown", [
      "*.md",
      ":(exclude,glob).pi/memory/**",
      ":(exclude,glob).pi/skills/**",
      ":(exclude)AGENTS.md",
    ]);
    for (const command of [
      "check-actionlint",
      "check-semgrep",
      "check-trivy",
      "check-typos",
      "check-yamllint",
      "check-taplo",
      "check-taplo-format",
    ])
      run(command);
    run("check-vale", ["README.md"]);
    run("check-terraform-nonempty", ["tf"]);
    for (const command of [
      "check-terraform-format",
      "check-terraform",
      "check-tflint",
    ])
      run(command, [], { TF_DIR: "tf" });
    run("pnpm", ["exec", "biome", "check", "."]);
    run("pnpm", ["exec", "knip"]);
    break;
  case "fix":
    run("factory-files", ["write"]);
    run("fix-terraform", [], { TF_DIR: "tf" });
    for (const command of [
      "fix-nixfmt",
      "fix-shfmt",
      "fix-taplo",
      "fix-editorconfig-eof",
    ])
      run(command);
    run("pnpm", ["exec", "biome", "check", "--write", "."]);
    break;
  case "test":
    run("test-semgrep", [], { SEMGREP_TESTS_DIR: ".semgrep/tests" });
    break;
  default:
    throw new Error("Expected check, fix or test");
}
