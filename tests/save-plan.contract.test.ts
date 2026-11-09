import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Permit server-only modules in the Node test runner, never in browser code.
vi.mock("server-only", () => ({}));

import { POST } from "@/app/api/v1/plans/[planId]/save/route";
import { createSaveHandler } from "@/server/plans/save";
import { authenticateSession, signSession } from "@/server/plans/session";
import { PlanStore } from "@/server/plans/store";
import type { Actor, PlanRecord } from "@/server/plans/types";
import { fixture } from "./fixtures/plans";

const base =
  "https://github.com/nqthai37/Wandora/blob/main/docs/contract/save-plan.md#";
const now = new Date("2026-11-09T08:00:00.000Z");
const secret = randomBytes(48).toString("base64url");
const owner: Actor = { userId: "user-1", role: "member" };
const validBody = { expectedVersion: 1, confirmed: true };
let store: PlanStore;
let handler: ReturnType<typeof createSaveHandler>;
let extraStores: PlanStore[];
let directories: string[];

function makeHandler(database: PlanStore) {
  return createSaveHandler({
    store: () => database,
    authenticate: (request) => authenticateSession(request, secret, now),
    now: () => now,
  });
}

function request(
  options: {
    actor?: Actor;
    token?: string | null;
    body?: string;
    headers?: Record<string, string>;
    planId?: string;
  } = {},
): Request {
  const token =
    options.token === undefined
      ? signSession(
          {
            ...(options.actor || owner),
            exp: Math.floor(now.getTime() / 1000) + 3600,
          },
          secret,
        )
      : options.token;
  return new Request(
    `https://wandora.test/api/v1/plans/${options.planId || "plan-1"}/save?ignored=1`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "save-1",
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      body: options.body ?? JSON.stringify(validBody),
    },
  );
}

function call(options: Parameters<typeof request>[0] = {}) {
  return handler(request(options), {
    params: Promise.resolve({ planId: options.planId || "plan-1" }),
  });
}

function change(edit: (record: PlanRecord) => void) {
  const record = store.getPlan("plan-1")!;
  edit(record);
  store.putPlan(record);
}

async function expectProblem(
  response: Response,
  slug: string,
  status: number,
  title: string,
) {
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain(
    "application/problem+json",
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body).toMatchObject({ type: base + slug, title, status });
  expect(body.detail).toEqual(expect.any(String));
  expect(body.detail.length).toBeGreaterThan(0);
  expect(body.instance).toMatch(/^\/api\/v1\/plans\/[^?]+\/save$/);
  expect(body.detail).not.toMatch(
    /SELECT |sqlite|Error:|AUTH_SESSION|[A-Z]:\\/i,
  );
  if (slug === "validation" || slug === "plan-invalid") {
    expect(body.errors.length).toBeGreaterThan(0);
    for (const error of body.errors)
      expect(error).toEqual({
        pointer: expect.any(String),
        code: expect.any(String),
        detail: expect.any(String),
      });
  } else expect(body).not.toHaveProperty("errors");
  return body;
}

function publicationCount() {
  return Number(
    store.database.prepare("SELECT count(*) AS count FROM snapshots").get()!
      .count,
  );
}

function assertUnpublished() {
  expect(store.getPlan("plan-1")!.plan.state).toBe("draft");
  expect(store.getPlan("plan-1")!.plan.version).toBe(1);
  expect(publicationCount()).toBe(0);
  expect(
    store.database.prepare("SELECT count(*) AS count FROM receipts").get()!
      .count,
  ).toBe(0);
}

beforeEach(() => {
  store = new PlanStore(":memory:");
  store.putPlan(fixture());
  handler = makeHandler(store);
  extraStores = [];
  directories = [];
});

afterEach(() => {
  store.close();
  for (const database of extraStores) database.close();
  for (const directory of directories) rmSync(directory, { recursive: true });
  vi.restoreAllMocks();
});

describe("save contract: authentication and ownership", () => {
  it("the exported Next route requires a session", async () => {
    const response = await POST(request({ token: null }), {
      params: Promise.resolve({ planId: "plan-1" }),
    });
    await expectProblem(
      response,
      "unauthenticated",
      401,
      "Authentication required",
    );
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  it.each([null, "forged-session", "eyJ1c2VySWQiOiJ1c2VyLTEifQ.invalid"])(
    "rejects missing or forged session %s",
    async (token) => {
      await expectProblem(
        await call({ token }),
        "unauthenticated",
        401,
        "Authentication required",
      );
      assertUnpublished();
    },
  );

  it("rejects an expired signed session", async () => {
    const token = signSession(
      { ...owner, exp: Math.floor(now.getTime() / 1000) },
      secret,
    );
    await expectProblem(
      await call({ token }),
      "unauthenticated",
      401,
      "Authentication required",
    );
  });

  it.each([
    { userId: "user-2", role: "member" as const },
    { userId: "outsider", role: "member" as const },
    { userId: "user-1", role: "admin" as const },
  ])("denies another user's plan or an ineligible role: %j", async (actor) => {
    await expectProblem(
      await call({ actor }),
      "forbidden",
      403,
      "Save forbidden",
    );
    assertUnpublished();
  });

  it("denies a creator who has left the group", async () => {
    change(({ plan }) => {
      plan.members = plan.members.filter(
        (member) => member.userId !== owner.userId,
      );
    });
    await expectProblem(await call(), "forbidden", 403, "Save forbidden");
    assertUnpublished();
  });

  it("does not trust a spoofed client identity", async () => {
    await expectProblem(
      await call({
        actor: { userId: "outsider", role: "member" },
        headers: { "X-User-Id": owner.userId },
        body: JSON.stringify({
          ...validBody,
          userId: owner.userId,
          role: "member",
        }),
      }),
      "forbidden",
      403,
      "Save forbidden",
    );
  });

  it("fails closed and hides configuration failures", async () => {
    handler = createSaveHandler({
      store: () => store,
      authenticate: (req) => authenticateSession(req, "", now),
      now: () => now,
    });
    const body = await expectProblem(
      await call(),
      "internal",
      500,
      "Internal error",
    );
    expect(body.detail).toBe("The request could not be completed.");
    assertUnpublished();
  });
});

describe("save contract: input and problem types", () => {
  it.each(["absent", "bad.id", "x".repeat(65)])(
    "returns not-found for %s",
    async (planId) => {
      await expectProblem(
        await call({ planId }),
        "not-found",
        404,
        "Plan not found",
      );
    },
  );

  it("checks authentication before resource visibility and ownership before body", async () => {
    await expectProblem(
      await call({ planId: "absent", token: null }),
      "unauthenticated",
      401,
      "Authentication required",
    );
    await expectProblem(
      await call({ actor: { userId: "user-2", role: "member" }, body: "{" }),
      "forbidden",
      403,
      "Save forbidden",
    );
  });

  it.each(["text/plain", "application/problem+json", ""])(
    "requires JSON media type %s",
    async (type) => {
      await expectProblem(
        await call({ headers: { "content-type": type } }),
        "unsupported-media-type",
        415,
        "JSON required",
      );
    },
  );

  it.each(["", "x".repeat(129), "has spaces", "bad/key"])(
    "rejects invalid idempotency key %s",
    async (key) => {
      await expectProblem(
        await call({ headers: { "idempotency-key": key } }),
        "idempotency-key-missing",
        400,
        "Idempotency-Key required",
      );
    },
  );

  it("rejects an absent key", async () => {
    const req = request();
    req.headers.delete("idempotency-key");
    await expectProblem(
      await handler(req, { params: Promise.resolve({ planId: "plan-1" }) }),
      "idempotency-key-missing",
      400,
      "Idempotency-Key required",
    );
  });

  it.each(["", "{", "undefined"])("rejects malformed JSON %s", async (body) => {
    await expectProblem(
      await call({ body }),
      "invalid-json",
      400,
      "Malformed JSON",
    );
  });

  it.each(["null", "[]", "true", "42"])(
    "rejects non-object JSON %s",
    async (body) => {
      const result = await expectProblem(
        await call({ body }),
        "validation",
        400,
        "Invalid request",
      );
      expect(result.errors[0].pointer).toBe("");
    },
  );

  it.each([0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1])(
    "validates version %s and reports all invalid fields",
    async (expectedVersion) => {
      const result = await expectProblem(
        await call({
          body: JSON.stringify({ expectedVersion, confirmed: "true" }),
        }),
        "validation",
        400,
        "Invalid request",
      );
      expect(
        result.errors.map((error: { pointer: string }) => error.pointer),
      ).toEqual(["/expectedVersion", "/confirmed"]);
      assertUnpublished();
    },
  );

  it("requires an explicit confirmation", async () => {
    await expectProblem(
      await call({
        body: JSON.stringify({ expectedVersion: 1, confirmed: false }),
      }),
      "validation",
      400,
      "Invalid request",
    );
    assertUnpublished();
  });

  it("limits actual streamed bytes, without relying on Content-Length", async () => {
    await expectProblem(
      await call({
        body: JSON.stringify({ ...validBody, ignored: "a".repeat(16384) }),
      }),
      "payload-too-large",
      413,
      "Request too large",
    );
    assertUnpublished();
  });

  it("accepts exactly 16384 bytes and a 128-character key", async () => {
    const start = JSON.stringify(validBody);
    const response = await call({
      body: start + " ".repeat(16384 - Buffer.byteLength(start)),
      headers: {
        "idempotency-key": "x".repeat(128),
        "content-type": "Application/JSON; charset=utf-8",
      },
    });
    expect(response.status).toBe(200);
  });

  it("rejects a stale draft version", async () => {
    await expectProblem(
      await call({
        body: JSON.stringify({ expectedVersion: 2, confirmed: true }),
      }),
      "version-conflict",
      409,
      "Plan version changed",
    );
    assertUnpublished();
  });
});

describe("save contract: publication, idempotency and transactions", () => {
  it("publishes the checked snapshot and calculates costs on the server", async () => {
    const response = await call({
      body: JSON.stringify({
        ...validBody,
        totalVnd: 0,
        validationPassed: true,
        stops: [],
        creatorId: "outsider",
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("idempotent-replayed")).toBe(false);
    const body = await response.json();
    expect(body).toEqual({
      planId: "plan-1",
      groupId: "group-1",
      version: 2,
      state: "saved",
      sharedWithGroup: true,
      savedAt: now.toISOString(),
      cost: {
        currency: "VND",
        totalVnd: 100000,
        members: [
          { userId: "user-1", totalVnd: 50000 },
          { userId: "user-2", totalVnd: 50000 },
        ],
      },
    });
    expect(publicationCount()).toBe(1);
    change(({ plan }) => {
      plan.stops = [];
    });
    const saved = JSON.parse(
      String(
        store.database.prepare("SELECT payload FROM snapshots").get()!.payload,
      ),
    );
    expect(saved.plan.stops).toHaveLength(1);
    expect(saved.receipt).toEqual(body);
  });

  it("replays an identical receipt even after time and catalog changes", async () => {
    const original = await (await call()).json();
    change(({ data }) => {
      data.places.museum.menu[0].priceVnd = 999999;
    });
    handler = createSaveHandler({
      store: () => store,
      authenticate: () => owner,
      now: () => new Date("2026-11-10T00:00:00Z"),
    });
    const replay = await call({
      body: '{ "confirmed": true, "ignored": 123, "expectedVersion": 1 }',
    });
    expect(replay.status).toBe(200);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(await replay.json()).toEqual(original);
    expect(publicationCount()).toBe(1);
  });

  it("rejects changed accepted fields for a used key", async () => {
    expect((await call()).status).toBe(200);
    await expectProblem(
      await call({
        body: JSON.stringify({ expectedVersion: 2, confirmed: true }),
      }),
      "idempotency-key-reused",
      422,
      "Idempotency-Key reused",
    );
    expect(publicationCount()).toBe(1);
  });

  it("does not republish with a new key", async () => {
    expect((await call()).status).toBe(200);
    await expectProblem(
      await call({
        headers: { "idempotency-key": "different-key" },
        body: JSON.stringify({ expectedVersion: 2, confirmed: true }),
      }),
      "version-conflict",
      409,
      "Plan version changed",
    );
    expect(publicationCount()).toBe(1);
  });

  it("scopes keys by caller and plan", async () => {
    expect((await call()).status).toBe(200);
    const second = fixture();
    second.plan.id = "plan-2";
    second.plan.creatorId = "user-2";
    store.putPlan(second);
    expect(
      (
        await call({
          planId: "plan-2",
          actor: { userId: "user-2", role: "member" },
        })
      ).status,
    ).toBe(200);
    expect(publicationCount()).toBe(2);
  });

  it("checks current membership before replay", async () => {
    expect((await call()).status).toBe(200);
    change(({ plan }) => {
      plan.members = plan.members.filter(
        (member) => member.userId !== owner.userId,
      );
    });
    await expectProblem(await call(), "forbidden", 403, "Save forbidden");
  });

  it("rechecks ownership after the request body is read", async () => {
    const req = request();
    const incoming = new ReadableStream(
      {
        pull(controller) {
          change(({ plan }) => {
            plan.creatorId = "user-2";
          });
          controller.enqueue(
            new TextEncoder().encode(JSON.stringify(validBody)),
          );
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    const streamed = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: incoming,
      duplex: "half",
    } as RequestInit);
    await expectProblem(
      await handler(streamed, {
        params: Promise.resolve({ planId: "plan-1" }),
      }),
      "forbidden",
      403,
      "Save forbidden",
    );
  });

  it.each([true, false])(
    "serializes concurrent saves (same key: %s)",
    async (sameKey) => {
      const responses = await Promise.all([
        call(),
        call({ headers: { "idempotency-key": sameKey ? "save-1" : "other" } }),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual(
        sameKey ? [200, 200] : [200, 409],
      );
      if (sameKey)
        expect(
          responses.filter(
            (response) =>
              response.headers.get("idempotent-replayed") === "true",
          ),
        ).toHaveLength(1);
      expect(publicationCount()).toBe(1);
    },
  );

  it("retains successful receipts across database reopen and beyond 24 hours", async () => {
    const directory = mkdtempSync(join(tmpdir(), "wandora-contract-"));
    directories.push(directory);
    const path = join(directory, "plans.sqlite");
    const first = new PlanStore(path);
    first.putPlan(fixture());
    const original = await (
      await makeHandler(first)(request(), {
        params: Promise.resolve({ planId: "plan-1" }),
      })
    ).json();
    first.close();
    const reopened = new PlanStore(path);
    extraStores.push(reopened);
    const later = createSaveHandler({
      store: () => reopened,
      authenticate: () => owner,
      now: () => new Date("2026-11-11T08:00:00Z"),
    });
    const response = await later(request(), {
      params: Promise.resolve({ planId: "plan-1" }),
    });
    expect(response.headers.get("idempotent-replayed")).toBe("true");
    expect(await response.json()).toEqual(original);
  });

  it("rolls back all publication state if writing a receipt fails", async () => {
    store.database.exec(
      "CREATE TRIGGER fail_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'synthetic persistence failure'); END;",
    );
    const body = await expectProblem(
      await call(),
      "internal",
      500,
      "Internal error",
    );
    expect(body.detail).toBe("The request could not be completed.");
    assertUnpublished();
    store.database.exec("DROP TRIGGER fail_receipt");
    expect((await call()).status).toBe(200);
  });
});

describe("save contract: backend validator", () => {
  const cases: [string, (record: PlanRecord) => void][] = [
    [
      "schema",
      ({ plan }) => {
        plan.candidateConfirmed = false;
      },
    ],
    [
      "schema",
      ({ plan }) => {
        plan.stops[0].selections[0].quantity = 0;
      },
    ],
    [
      "schema",
      ({ plan }) => {
        plan.stops[0].startsAt = "2026-02-30T09:00:00+07:00";
      },
    ],
    [
      "schema",
      ({ plan }) => {
        plan.members.push({ ...plan.members[0] });
      },
    ],
    [
      "schema",
      ({ plan }) => {
        plan.members[0].capVnd = -1;
      },
    ],
    [
      "schema",
      ({ data }) => {
        data.places.museum.menu[0].priceVnd = Number.MAX_SAFE_INTEGER;
      },
    ],
    [
      "unknown-place",
      ({ plan }) => {
        plan.stops[0].placeId = "invented";
      },
    ],
    [
      "unknown-item",
      ({ plan }) => {
        plan.stops[0].selections[0].itemId = "park-ticket";
      },
    ],
    [
      "unchecked-place",
      ({ data }) => {
        data.places.museum.menu = [];
      },
    ],
    [
      "unchecked-place",
      ({ data }) => {
        data.places.museum.hours = {};
      },
    ],
    [
      "closed",
      ({ data }) => {
        data.places.museum.hours["1"] = [[600, 1200]];
      },
    ],
    [
      "closed",
      ({ data }) => {
        data.places.museum.hours["1"] = [];
      },
    ],
    [
      "travel-time",
      ({ data }) => {
        data.travelMinutes["origin:museum"] = 61;
      },
    ],
    [
      "travel-time",
      ({ data }) => {
        delete data.travelMinutes["origin:museum"];
      },
    ],
    [
      "personal-cap",
      ({ plan }) => {
        plan.members[0].capVnd = 49999;
      },
    ],
    [
      "personal-cap",
      ({ plan }) => {
        plan.members[1].capVnd = 10000;
        plan.stops[0].selections = [plan.stops[0].selections[0]];
      },
    ],
    [
      "group-budget",
      ({ plan }) => {
        plan.groupBudgetVnd = 99999;
      },
    ],
    [
      "rain",
      ({ data }) => {
        data.places.museum.indoors = false;
        data.weather.hours["2026-11-09T09:00:00+07:00"] = 61;
      },
    ],
    [
      "weather-unavailable",
      ({ data }) => {
        data.weather.forecastStart = "2026-11-01";
      },
    ],
    [
      "weather-unavailable",
      ({ data }) => {
        data.places.museum.indoors = false;
        data.weather.hours = {};
      },
    ],
  ];

  it.each(cases)(
    "refuses %s without any partial publication (%#)",
    async (code, edit) => {
      change(edit);
      const body = await expectProblem(
        await call(),
        "plan-invalid",
        422,
        "Plan rejected",
      );
      expect(body.errors).toContainEqual(expect.objectContaining({ code }));
      assertUnpublished();
    },
  );

  it("accepts exact budget/caps and rain probability of 60 percent", async () => {
    change(({ plan, data }) => {
      plan.members.forEach((member) => {
        member.capVnd = 50000;
      });
      plan.groupBudgetVnd = 100000;
      data.places.museum.indoors = false;
      data.weather.hours["2026-11-09T09:00:00+07:00"] = 60;
    });
    expect((await call()).status).toBe(200);
  });

  it("checks travel and weather across stops, including the end's hourly slot", async () => {
    change(({ plan, data }) => {
      plan.stops.push({
        placeId: "park",
        startsAt: "2026-11-09T10:10:00+07:00",
        endsAt: "2026-11-09T11:01:00+07:00",
        selections: [],
      });
      data.weather.hours["2026-11-09T11:00:00+07:00"] = 90;
    });
    const body = await expectProblem(
      await call(),
      "plan-invalid",
      422,
      "Plan rejected",
    );
    expect(body.errors.map((error: { code: string }) => error.code)).toEqual(
      expect.arrayContaining(["travel-time", "rain"]),
    );
  });

  it("allows correcting a rejected draft and reusing its unreserved key", async () => {
    change(({ plan }) => {
      plan.groupBudgetVnd = 99999;
    });
    await expectProblem(await call(), "plan-invalid", 422, "Plan rejected");
    change(({ plan }) => {
      plan.groupBudgetVnd = 200000;
    });
    expect((await call()).status).toBe(200);
    expect(publicationCount()).toBe(1);
  });

  it("the contract lists every error type exercised by this suite", () => {
    const contract = readFileSync(
      join(process.cwd(), "docs/contract/save-plan.md"),
      "utf8",
    );
    const slugs = [
      ...contract.matchAll(/^\|\s+`([a-z-]+)`\s+\|\s+\d{3}\s+\|/gm),
    ].map((match) => match[1]);
    expect(slugs.sort()).toEqual(
      [
        "unauthenticated",
        "not-found",
        "forbidden",
        "unsupported-media-type",
        "idempotency-key-missing",
        "payload-too-large",
        "invalid-json",
        "validation",
        "idempotency-key-reused",
        "version-conflict",
        "plan-invalid",
        "internal",
      ].sort(),
    );
  });
});
