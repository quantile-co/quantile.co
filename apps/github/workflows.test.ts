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

it("runs the workload on the managed runner without a per-job collector", () => {
  const workflow = read(".github/workflows/test.yaml");
  expect(workflow).toContain(
    "runs-on: namespace-profile-quantile-4x8;tailscale.spec=quantile",
  );
  expect(workflow).toContain('"$direnv" exec . pnpm run github:test');
  expect(workflow).not.toMatch(/QUANTILE_OTLP_|actions\/otel@|id-token: write/);
});
