import { GoogleAuth } from "google-auth-library";

export type Mail = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  html: string;
};

export type WelcomeJob = {
  eventId: string;
  subscriptionId: string;
  mode: "test" | "live";
  idempotencyKey: string;
  mail: Mail;
  testScope?: string;
  testRun?: string;
  testTarget?: string;
};

type Post = (url: string, body: unknown) => Promise<unknown>;

export async function createWelcomeExecution(
  job: WelcomeJob,
  env: Record<string, string | undefined>,
) {
  const target = readWorkflowTarget(env);
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return createWorkflowStarter(target, async (url, data) => {
    const response = await auth.request({
      url,
      method: "POST",
      data,
      timeout: 10_000,
      retry: false,
    });
    return response.data;
  })(job);
}

export function readWorkflowTarget(env: Record<string, string | undefined>) {
  const name = env.WELCOME_WORKFLOW;
  if (
    !/^projects\/[a-z][a-z0-9-]+\/locations\/[a-z0-9-]+\/workflows\/[a-zA-Z0-9_-]+$/.test(
      name ?? "",
    )
  ) {
    throw new Error("Invalid welcome workflow resource.");
  }
  if (
    env.WELCOME_MODE === "test" &&
    (!/^pr-[1-9][0-9]*$/.test(env.WELCOME_TEST_SCOPE ?? "") ||
      !name?.endsWith(`/workflows/${env.WELCOME_TEST_SCOPE}-welcome`))
  ) {
    throw new Error(
      "Connected development requires its PR's welcome workflow.",
    );
  }
  return {
    name: name as string,
    url: `https://workflowexecutions.googleapis.com/v1/${name}/executions`,
  };
}

export function createWorkflowStarter(
  target: ReturnType<typeof readWorkflowTarget>,
  post: Post,
) {
  return async (job: WelcomeJob): Promise<string> => {
    // Await durable acceptance, not delivery. Ambiguous responses may create
    // another execution; the same subscription always retains the same email key.
    const result = await post(target.url, {
      argument: JSON.stringify(job),
      callLogLevel: "LOG_NONE",
      executionHistoryLevel: "EXECUTION_HISTORY_BASIC",
      ...(job.mode === "test" && job.testScope && job.testRun
        ? {
            labels: { namespace: job.testScope, test_run: job.testRun },
          }
        : {}),
    });
    const name = (result as { name?: unknown } | null)?.name;
    const prefix = `${target.name}/executions/`;
    if (
      typeof name !== "string" ||
      !name.startsWith(prefix) ||
      !/^[\w-]+$/.test(name.slice(prefix.length))
    ) {
      throw new Error("Workflow acceptance was not confirmed.");
    }
    return name;
  };
}
