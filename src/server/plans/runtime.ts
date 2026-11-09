import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { authenticateSession } from "./session";
import { createSaveHandler } from "./save";
import { PlanStore } from "./store";

let store: PlanStore | undefined;

function getStore(): PlanStore {
  if (!store) {
    // Persistent runtime data must not be traced into the deployment bundle.
    const path = resolve(
      /* turbopackIgnore: true */ process.env.PLAN_STORE_PATH ||
        ".data/plans.sqlite",
    );
    mkdirSync(dirname(path), { recursive: true });
    store = new PlanStore(path);
  }
  return store;
}

export const savePlan = createSaveHandler({
  store: getStore,
  authenticate: (request) =>
    authenticateSession(
      request,
      process.env.AUTH_SESSION_SECRET || "",
      new Date(),
    ),
  now: () => new Date(),
});
