// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub expressions are literal workflow source.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

it("provisions the repository bank with ephemeral credentials only in protected Plan/Apply", () => {
  const variable = read("tf/variables.tf").match(
    /variable "hindsight_api_token" \{([\s\S]*?)\n\}/,
  )?.[1];
  expect(variable).toBeDefined();
  expect(variable).toMatch(/sensitive\s*=\s*true/);
  expect(variable).toMatch(/ephemeral\s*=\s*true/);
  expect(variable).not.toMatch(/default\s*=/);
  expect(read("tf/providers.tf")).toMatch(
    /alias\s*=\s*"hindsight"\s+base_url\s*=\s*"https:\/\/api\.hindsight\.vectorize\.io"\s+security\s*=\s*\{\s*http\s*=\s*\{\s*token\s*=\s*\{\s*token\s*=\s*var\.hindsight_api_token/,
  );
  const main = read("tf/main.tf");
  expect(main).toContain(
    "tf/modules/project/hindsight?ref=cfd80679d22a7f0c6c6c4a259f65c6d357058963",
  );
  expect(main).toMatch(/restful\s*=\s*restful\.hindsight/);
  expect(main).toMatch(/bank_id\s*=\s*"quantile-co--quantile-co"/);
  expect(main).toMatch(/name\s*=\s*"quantile-co\/quantile\.co"/);
  for (const phase of ["plan", "apply"]) {
    const workflow = read(`.github/workflows/${phase}.yaml`);
    expect(workflow).toContain(
      "HINDSIGHT_API_TOKEN: ${{ secrets.HINDSIGHT_API_TOKEN }}",
    );
    expect(workflow).toContain("github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("environment: prod");
    expect(workflow).toContain("group: site-production");
    expect(workflow).toContain("cancel-in-progress: false");
  }
  for (const phase of ["check", "test", "build"])
    expect(read(`.github/workflows/${phase}.yaml`)).not.toContain(
      "HINDSIGHT_API_TOKEN",
    );
});

it.each(["check", "test"])(
  "keeps public %s read-only with job-local caches",
  (phase) => {
    const workflow = read(`.github/workflows/${phase}.yaml`);
    expect(workflow.match(/^ *permissions:.*$/gm)).toEqual(["permissions:"]);
    expect(workflow).toContain("permissions:\n  contents: read\n\n");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("TURBO_CACHE: local:rw");
    expect(workflow).not.toMatch(
      /environment:|\bsecrets\b|id-token:|remote:|nscloud-cache-action|actions\/cache@|cachix\/cachix-action@/,
    );
  },
);

it("limits publication permissions to the Build application job", () => {
  const [build, rejection] = read(".github/workflows/build.yaml").split(
    "\n  reject-ref:\n",
  );
  expect(build).toContain(
    "permissions:\n      contents: write\n      actions: read",
  );
  expect(rejection).toContain("permissions: {}");
  expect(rejection).not.toContain("contents: write");
});

it("runs the required Check job for push and pull_request without bypassing fork approval", () => {
  const workflow = read(".github/workflows/check.yaml");
  expect(workflow).toContain("  pull_request:\n");
  expect(workflow).not.toContain("pull_request_target");
  expect(workflow).toContain("  push:\n");
  expect(workflow).toContain("  all:\n    name: All\n");
  expect(workflow).toContain("direnv exec . pnpm run check");
});

it("runs manual main Test on the managed runner without a per-job collector", () => {
  const workflow = read(".github/workflows/test.yaml");
  expect(workflow).toContain(
    "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
  );
  expect(workflow).toContain(
    "runs-on: namespace-profile-factory-4x8;tailscale.spec=quantile",
  );
  expect(workflow).toContain('"$direnv" exec . pnpm run github:test');
  expect(workflow).not.toMatch(/QUANTILE_OTLP_|actions\/otel@|id-token: write/);
});
