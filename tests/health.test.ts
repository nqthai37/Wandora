import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

it("GET /api/health returns status ok", async () => {
  const res = GET();
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
