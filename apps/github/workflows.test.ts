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
    /alias\s*=\s*"hindsight"\s+uri\s*=\s*"https:\/\/api\.hindsight\.vectorize\.io"\s+bearer_token\s*=\s*var\.hindsight_api_token/,
  );
  const main = read("tf/main.tf");
  expect(main).toContain(
    "tf/modules/project/hindsight?ref=7d3121912d8a28a9ab85c7005f3ab7ff4ef9e481",
  );
  expect(main).toMatch(/restapi\s*=\s*restapi\.hindsight/);
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

it("opts only protected manual main Test into the published Collector action", () => {
  const workflow = read(".github/workflows/test.yaml");
  expect(workflow).toContain("on:\n  workflow_dispatch:");
  expect(workflow).toContain(
    "if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
  );
  expect(workflow).toContain("    environment: prod");
  expect(workflow).toContain("    runs-on: namespace-profile-quantile-4x8");
  expect(workflow).toContain(
    "QUANTILE_OTLP_ENDPOINT: ${{ vars.QUANTILE_OTLP_ENDPOINT }}",
  );
  expect(workflow).toContain("id-token: write");
  expect(workflow).not.toMatch(
    /QUANTILE_OTLP_INGEST_|get-secretmanager-secrets/,
  );
  expect(workflow).toContain(
    "quantile-co/factory/.github/actions/otel@6be9414260216afaf5315d5ec03c2f151eef14b4",
  );
  expect(workflow).not.toContain("pnpm otel");
  for (const phase of ["check", "build", "plan", "apply"])
    expect(read(`.github/workflows/${phase}.yaml`)).not.toMatch(
      /CLICKSTACK_|QUANTILE_OTLP_|pnpm otel/,
    );
  const { scripts, devDependencies } = JSON.parse(read("package.json"));
  expect(scripts.otel).toBeUndefined();
  expect(scripts["github:test"]).toBe("pnpm test");
  expect(devDependencies["@quantile-co/factory-otel"]).toBeUndefined();
});

it("starts the job-identity Collector before the workload", () => {
  const workflow = read(".github/workflows/test.yaml");
  const markers = [
    "- name: Check out repository",
    "- name: Start OpenTelemetry Collector",
    'direnv="$(nix build',
    '"$direnv" allow .',
    '"$direnv" exec . pnpm install --frozen-lockfile',
    '"$direnv" exec . pnpm run github:test',
  ];
  let previous = -1;
  for (const marker of markers) {
    const index = workflow.indexOf(marker);
    expect(index).toBeGreaterThan(previous);
    previous = index;
  }
  expect(workflow.split("- name: Run checks, then tests")[1]).not.toContain(
    "QUANTILE_OTLP_",
  );
  const flake = read("flake.nix");
  expect(flake).toContain('otelJobs = [ "test" ];');
  expect(flake).not.toMatch(/CLICKSTACK_API_KEY|CLICKSTACK_OTLP_ENDPOINT/);
  for (const name of ["BINARY", "CONFIG", "DOCKER_CONFIG", "JOURNAL_CONFIG"])
    expect(flake).toContain(`export QUANTILE_OTELCOL_${name}=`);
});
