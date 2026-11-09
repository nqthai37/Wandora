import { expect, it } from "vitest";

it("deliberately fails to prove the test job can go red", () => {
  expect(1).toBe(2);
});
