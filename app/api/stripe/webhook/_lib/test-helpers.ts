import { randomUUID } from "node:crypto";

export function createTestRun(
  scope: string,
  target: string,
  delivery: "delivered" | "bounced",
) {
  if (!/^pr-[1-9][0-9]*$/.test(scope))
    throw new Error("Connected tests require a private PR namespace (pr-N).");
  if (target !== "preview" && !/^local-[a-f0-9]{32}$/.test(target))
    throw new Error("Invalid connected-test target.");
  const id = randomUUID().replaceAll("-", "");
  return {
    id,
    scope,
    target,
    recipient: `${delivery}+${scope}-${id}@resend.dev`,
    metadata: {
      quantile_test_scope: scope,
      quantile_test_run: id,
      quantile_test_target: target,
      quantile_test_delivery: delivery,
    },
  };
}

export function assertTestOwnership(
  object: { livemode: boolean; metadata: Record<string, string> | null },
  run: ReturnType<typeof createTestRun>,
) {
  if (
    object.livemode ||
    Object.entries(run.metadata).some(
      ([key, value]) => object.metadata?.[key] !== value,
    )
  ) {
    throw new Error(
      "Refusing to modify a live object or another test run's resources.",
    );
  }
}
