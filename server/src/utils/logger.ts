export function log(level: "info" | "error", event: string, fields: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line); else console.log(line);
}
export function safeError(error: unknown) {
  // Error messages (including multiline messages and custom stacks) may contain
  // credentials or request bodies. Log only a fixed category, never raw errors.
  return { errorType: error instanceof Error ? "Error" : "UnknownError" };
}
