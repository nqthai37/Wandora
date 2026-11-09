export const problemDefinitions = {
  unauthenticated: [401, "Authentication required"],
  "not-found": [404, "Plan not found"],
  forbidden: [403, "Save forbidden"],
  "unsupported-media-type": [415, "JSON required"],
  "idempotency-key-missing": [400, "Idempotency-Key required"],
  "payload-too-large": [413, "Request too large"],
  "invalid-json": [400, "Malformed JSON"],
  validation: [400, "Invalid request"],
  "idempotency-key-reused": [422, "Idempotency-Key reused"],
  "version-conflict": [409, "Plan version changed"],
  "plan-invalid": [422, "Plan rejected"],
  internal: [500, "Internal error"],
} as const;

export type ProblemName = keyof typeof problemDefinitions;
export const problemBase =
  "https://github.com/nqthai37/Wandora/blob/main/docs/contract/save-plan.md#";

export function problem(
  name: ProblemName,
  instance: string,
  detail: string,
  errors?: { pointer: string; code: string; detail: string }[],
): Response {
  const [status, title] = problemDefinitions[name];
  return Response.json(
    {
      type: `${problemBase}${name}`,
      title,
      status,
      detail:
        name === "internal" ? "The request could not be completed." : detail,
      instance,
      ...(errors ? { errors } : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
        ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}),
      },
    },
  );
}
