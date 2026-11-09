import "server-only";
import type { CheckedData, Cost, FieldError, Plan, Stop } from "./types";

const minute = 60_000;
const day = 24 * 60 * minute;
const safeMoney = (n: unknown): n is number =>
  Number.isSafeInteger(n) && Number(n) >= 0;
const id = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function localTime(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+07:00$/.test(value)
  )
    return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  // Date.parse normalizes invalid calendar dates; a round-trip must not.
  return new Date(time + 7 * 60 * minute).toISOString().slice(0, 19) +
    "+07:00" ===
    value
    ? time
    : null;
}

function validStop(value: unknown, memberIds: Set<string>): value is Stop {
  if (
    !object(value) ||
    !id(value.placeId) ||
    localTime(value.startsAt) === null ||
    localTime(value.endsAt) === null ||
    !Array.isArray(value.selections)
  )
    return false;
  if (
    String(value.startsAt).slice(0, 10) !== String(value.endsAt).slice(0, 10) ||
    Date.parse(String(value.startsAt)) >= Date.parse(String(value.endsAt))
  )
    return false;
  return value.selections.every(
    (line: unknown) =>
      object(line) &&
      typeof line.userId === "string" &&
      memberIds.has(line.userId) &&
      id(line.itemId) &&
      Number.isSafeInteger(line.quantity) &&
      Number(line.quantity) >= 1 &&
      Number(line.quantity) <= 100,
  );
}

function validPlan(value: unknown): value is Plan {
  if (
    !object(value) ||
    !id(value.id) ||
    !id(value.groupId) ||
    !id(value.creatorId) ||
    !id(value.startPlaceId) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    Number(value.version) >= Number.MAX_SAFE_INTEGER ||
    (value.state !== "draft" && value.state !== "saved") ||
    value.candidateConfirmed !== true ||
    localTime(value.startsAt) === null ||
    !safeMoney(value.groupBudgetVnd) ||
    !Array.isArray(value.members) ||
    value.members.length < 1 ||
    !Array.isArray(value.stops) ||
    value.stops.length < 1 ||
    value.stops.length > 100
  )
    return false;
  const members = value.members;
  if (
    !members.every(
      (member: unknown) =>
        object(member) && id(member.userId) && safeMoney(member.capVnd),
    )
  )
    return false;
  const ids = new Set(members.map((member) => String(member.userId)));
  if (ids.size !== members.length) return false;
  if (!value.stops.every((stop: unknown) => validStop(stop, ids))) return false;
  let previousEnd = Date.parse(String(value.startsAt));
  for (const stop of value.stops as Stop[]) {
    if (Date.parse(stop.startsAt) < previousEnd) return false;
    previousEnd = Date.parse(stop.endsAt);
  }
  return true;
}

export function validatePlan(
  value: unknown,
  data: CheckedData,
): { errors: FieldError[]; cost?: Cost } {
  const errors: FieldError[] = [];
  const add = (pointer: string, code: string, detail: string) =>
    errors.push({ pointer, code, detail });
  if (!validPlan(value)) {
    add("", "schema", "The stored draft does not match the plan schema.");
    return { errors };
  }
  const plan = value;
  const totals = new Map(plan.members.map((member) => [member.userId, 0]));
  const lowestCap = Math.min(...plan.members.map((member) => member.capVnd));
  let previousPlace = plan.startPlaceId;
  let previousEnd = Date.parse(plan.startsAt);
  const forecastStart = Date.parse(
    `${data.weather.forecastStart}T00:00:00+07:00`,
  );
  for (const [index, stop] of plan.stops.entries()) {
    const pointer = `/stops/${index}`;
    const start = Date.parse(stop.startsAt);
    const end = Date.parse(stop.endsAt);
    const travel =
      previousPlace === stop.placeId
        ? 0
        : data.travelMinutes[`${previousPlace}:${stop.placeId}`];
    if (
      !Number.isFinite(travel) ||
      travel < 0 ||
      start - previousEnd < travel * minute
    )
      add(
        pointer,
        "travel-time",
        "The motorbike journey does not fit the gap.",
      );
    previousPlace = stop.placeId;
    previousEnd = end;
    const insideForecast =
      Number.isFinite(forecastStart) &&
      start >= forecastStart &&
      end <= forecastStart + 7 * day;
    if (!insideForecast)
      add(
        pointer,
        "weather-unavailable",
        "The stop is outside the seven-day forecast.",
      );
    const place = Object.hasOwn(data.places, stop.placeId)
      ? data.places[stop.placeId]
      : undefined;
    if (!place) {
      add(
        `${pointer}/placeId`,
        "unknown-place",
        "The place is not in the checked catalog.",
      );
      continue;
    }
    const date = stop.startsAt.slice(0, 10);
    const weekday = String(new Date(`${date}T00:00:00Z`).getUTCDay());
    const hours = place.hours?.[weekday];
    if (
      !Array.isArray(hours) ||
      !Array.isArray(place.menu) ||
      place.menu.length < 1
    ) {
      add(
        pointer,
        "unchecked-place",
        "The place lacks checked opening hours or menu.",
      );
      continue;
    }
    const midnight = Date.parse(`${date}T00:00:00+07:00`);
    if (
      !hours.some(
        ([open, close]) =>
          safeMoney(open) &&
          safeMoney(close) &&
          open < close &&
          close <= 1440 &&
          start >= midnight + open * minute &&
          end <= midnight + close * minute,
      )
    )
      add(pointer, "closed", "The stop is outside checked opening hours.");
    for (const [lineIndex, line] of stop.selections.entries()) {
      const item = place.menu.find((candidate) => candidate.id === line.itemId);
      if (!item) {
        add(
          `${pointer}/selections/${lineIndex}/itemId`,
          "unknown-item",
          "The item does not belong to this checked place.",
        );
        continue;
      }
      const total = totals.get(line.userId)! + item.priceVnd * line.quantity;
      if (!safeMoney(item.priceVnd) || !safeMoney(total))
        add(
          `${pointer}/selections/${lineIndex}`,
          "schema",
          "Money must be a safe integer number of VND.",
        );
      else totals.set(line.userId, total);
    }
    if (!place.indoors && insideForecast) {
      for (
        let hour = Math.floor(start / (60 * minute)) * 60 * minute;
        hour < end;
        hour += 60 * minute
      ) {
        const key =
          new Date(hour + 7 * 60 * minute).toISOString().slice(0, 19) +
          "+07:00";
        const probability = data.weather.hours[key];
        if (
          !Number.isFinite(probability) ||
          probability < 0 ||
          probability > 100
        )
          add(
            pointer,
            "weather-unavailable",
            "The outdoor stop lacks a checked hourly forecast.",
          );
        else if (probability > 60)
          add(
            pointer,
            "rain",
            "An outdoor stop overlaps rain probability above 60 percent.",
          );
      }
    }
  }
  let totalVnd = 0;
  for (const [index, member] of plan.members.entries()) {
    const total = totals.get(member.userId)!;
    if (total > member.capVnd || total > lowestCap)
      add(
        `/members/${index}/capVnd`,
        "personal-cap",
        "Spending exceeds the member or lowest group cap.",
      );
    totalVnd += total;
  }
  if (!safeMoney(totalVnd))
    add(
      "/groupBudgetVnd",
      "schema",
      "The group total is not a safe integer number of VND.",
    );
  else if (totalVnd > plan.groupBudgetVnd)
    add(
      "/groupBudgetVnd",
      "group-budget",
      "Spending exceeds the group budget.",
    );
  return {
    errors,
    ...(errors.length
      ? {}
      : {
          cost: {
            currency: "VND" as const,
            totalVnd,
            members: plan.members.map(({ userId }) => ({
              userId,
              totalVnd: totals.get(userId)!,
            })),
          },
        }),
  };
}
