import "server-only";
import { problem } from "./problems";
import type { PlanStore } from "./store";
import type { Actor, FieldError, Plan, SaveReceipt } from "./types";
import { validatePlan } from "./validate";

export type SaveDependencies = {
  store: () => PlanStore;
  authenticate: (request: Request) => Actor | null;
  now: () => Date;
};
export type SaveContext = { params: Promise<{ planId: string }> };

function maySave(actor: Actor, plan: Plan): boolean {
  return (
    actor.role === "member" &&
    plan.members.some((member) => member.userId === actor.userId)
  );
}

async function boundedBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16_384) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    reader.releaseLock();
  }
}

export function createSaveHandler(deps: SaveDependencies) {
  return async function save(
    request: Request,
    context: SaveContext,
  ): Promise<Response> {
    const instance = new URL(request.url).pathname;
    try {
      const actor = deps.authenticate(request);
      if (!actor)
        return problem(
          "unauthenticated",
          instance,
          "A valid bearer session is required.",
        );
      const { planId } = await context.params;
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(planId))
        return problem(
          "not-found",
          instance,
          "No plan exists with this identifier.",
        );
      const store = deps.store();
      const existing = store.getPlan(planId);
      if (!existing)
        return problem(
          "not-found",
          instance,
          "No plan exists with this identifier.",
        );
      if (!maySave(actor, existing.plan))
        return problem(
          "forbidden",
          instance,
          "Only the draft creator who still belongs to its group may save.",
        );
      if (
        request.headers
          .get("content-type")
          ?.split(";")[0]
          .trim()
          .toLowerCase() !== "application/json"
      )
        return problem(
          "unsupported-media-type",
          instance,
          "Send the save request as application/json.",
        );
      const key = request.headers.get("idempotency-key");
      if (!key || !/^[A-Za-z0-9_-]{1,128}$/.test(key))
        return problem(
          "idempotency-key-missing",
          instance,
          "Supply a key of 1 to 128 letters, digits, underscores or hyphens.",
        );
      const raw = await boundedBody(request);
      if (raw === null)
        return problem(
          "payload-too-large",
          instance,
          "The request body exceeds 16384 bytes.",
        );
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        return problem(
          "invalid-json",
          instance,
          "The body must contain valid JSON.",
        );
      }
      const errors: FieldError[] = [];
      if (!body || typeof body !== "object" || Array.isArray(body))
        errors.push({
          pointer: "",
          code: "object",
          detail: "The save body must be an object.",
        });
      else {
        const input = body as Record<string, unknown>;
        if (
          !Number.isSafeInteger(input.expectedVersion) ||
          Number(input.expectedVersion) < 1
        )
          errors.push({
            pointer: "/expectedVersion",
            code: "version",
            detail: "Expected version must be a positive safe integer.",
          });
        if (input.confirmed !== true)
          errors.push({
            pointer: "/confirmed",
            code: "confirmation",
            detail: "Confirm the reviewed schedule with boolean true.",
          });
      }
      if (errors.length)
        return problem(
          "validation",
          instance,
          "The save request contains invalid fields.",
          errors,
        );
      const { expectedVersion, confirmed } = body as {
        expectedVersion: number;
        confirmed: true;
      };
      const fingerprint = JSON.stringify({ expectedVersion, confirmed });
      const scope = JSON.stringify([actor.userId, planId, key]);
      return store.transaction(() => {
        const current = store.getPlan(planId);
        if (!current)
          return problem(
            "not-found",
            instance,
            "No plan exists with this identifier.",
          );
        if (!maySave(actor, current.plan))
          return problem(
            "forbidden",
            instance,
            "Only the draft creator who still belongs to its group may save.",
          );
        const saved = store.getReceipt(scope);
        if (saved) {
          if (saved.fingerprint !== fingerprint)
            return problem(
              "idempotency-key-reused",
              instance,
              "This key was used with different save fields.",
            );
          return Response.json(saved.receipt, {
            headers: {
              "Cache-Control": "no-store",
              "Idempotent-Replayed": "true",
            },
          });
        }
        if (
          current.plan.version !== expectedVersion ||
          current.plan.state !== "draft"
        )
          return problem(
            "version-conflict",
            instance,
            "Refetch and review the current draft before saving.",
          );
        const validation = validatePlan(current.plan, current.data);
        if (validation.errors.length)
          return problem(
            "plan-invalid",
            instance,
            "The plan must pass backend validation before sharing.",
            validation.errors,
          );
        if (!validation.cost) throw new Error("Validator returned no cost");
        const receipt: SaveReceipt = {
          planId,
          groupId: current.plan.groupId,
          version: expectedVersion + 1,
          state: "saved",
          sharedWithGroup: true,
          savedAt: deps.now().toISOString(),
          cost: validation.cost,
        };
        current.plan.version = receipt.version;
        current.plan.state = "saved";
        store.publish(current, scope, fingerprint, receipt);
        return Response.json(receipt, {
          headers: { "Cache-Control": "no-store" },
        });
      });
    } catch {
      return problem(
        "internal",
        instance,
        "The request could not be completed.",
      );
    }
  };
}
