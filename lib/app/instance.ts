import { z } from "zod";

// Shared value validation, not an environment reader.
export const appInstanceSchema = z
  .string()
  .regex(/^[a-z](?:[a-z0-9-]{0,18}[a-z0-9])?$/);

export function parseAppInstance(value: unknown): string {
  const parsed = appInstanceSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Invalid app instance. Use 1–20 lowercase characters, starting with a letter and ending with a letter or number.",
    );
  return parsed.data;
}

export function belongsToAppInstance(
  appInstance: string,
  operationId: string | undefined,
): operationId is string {
  return (
    appInstanceSchema.safeParse(appInstance).success &&
    Boolean(operationId?.startsWith(`${appInstance}-`)) &&
    /^[a-f0-9]{32}$/.test(operationId?.slice(appInstance.length + 1) ?? "")
  );
}
