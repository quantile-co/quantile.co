import { describe, expect, it, vi } from "vitest";
import {
  createWorkflowStarter,
  readWorkflowTarget,
  type WelcomeJob,
} from "./workflow";

const resource =
  "projects/local-test/locations/us-central1/workflows/pr-1-welcome";
const env = {
  WELCOME_MODE: "test",
  WELCOME_WORKFLOW: resource,
  WELCOME_TEST_SCOPE: "pr-1",
};
const job: WelcomeJob = {
  eventId: "evt_local",
  subscriptionId: "sub_local",
  mode: "test",
  idempotencyKey: "welcome/test/sub_local",
  testScope: "pr-1",
  testRun: "00000000000000000000000000000001",
  testTarget: "preview",
  mail: {
    from: "welcome@example.com",
    to: ["delivered@resend.dev"],
    reply_to: "help@example.com",
    subject: "Welcome",
    html: "<p>Welcome</p>",
    text: "Welcome",
  },
};

describe("workflow acceptance", () => {
  it("sends a stable payload and namespaced labels without logging arguments", async () => {
    const post = vi
      .fn()
      .mockResolvedValue({ name: `${resource}/executions/accepted-123` });
    await expect(
      createWorkflowStarter(readWorkflowTarget(env), post)(job),
    ).resolves.toBe(`${resource}/executions/accepted-123`);
    expect(post).toHaveBeenCalledWith(
      `https://workflowexecutions.googleapis.com/v1/${resource}/executions`,
      {
        argument: JSON.stringify(job),
        callLogLevel: "LOG_NONE",
        executionHistoryLevel: "EXECUTION_HISTORY_BASIC",
        labels: { namespace: job.testScope, test_run: job.testRun },
      },
    );
  });
  it.each([
    null,
    {},
    { name: `${resource}/executions/` },
    { name: "projects/wrong/locations/us/workflows/other/executions/id" },
  ])("requires an execution receipt: %o", async (receipt) => {
    await expect(
      createWorkflowStarter(readWorkflowTarget(env), async () => receipt)(job),
    ).rejects.toThrow("not confirmed");
  });
  it("propagates failed/ambiguous starts so Stripe can retry", async () => {
    const post = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(
      createWorkflowStarter(readWorkflowTarget(env), post)(job),
    ).rejects.toThrow("timeout");
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe("workflow configuration", () => {
  it.each([
    undefined,
    "",
    "https://evil.example",
    `${resource}?bad=1`,
  ])("rejects invalid resources: %s", (name) => {
    expect(() =>
      readWorkflowTarget({ ...env, WELCOME_WORKFLOW: name }),
    ).toThrow();
  });
  it.each([
    undefined,
    "developer",
    "pr-2",
  ])("rejects absent or mismatched PR namespaces: %s", (scope) => {
    expect(() =>
      readWorkflowTarget({ ...env, WELCOME_TEST_SCOPE: scope }),
    ).toThrow();
  });
});
