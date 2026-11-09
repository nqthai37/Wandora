import type { PlanRecord } from "@/server/plans/types";

// Synthetic checked data only. Not real opening hours, prices or forecasts.
export function fixture(): PlanRecord {
  const hours = Object.fromEntries(
    Array.from({ length: 7 }, (_, day) => [
      String(day),
      [[480, 1200] as [number, number]],
    ]),
  );
  return {
    plan: {
      id: "plan-1",
      groupId: "group-1",
      creatorId: "user-1",
      version: 1,
      state: "draft",
      candidateConfirmed: true,
      startsAt: "2026-11-09T08:00:00+07:00",
      startPlaceId: "origin",
      members: [
        { userId: "user-1", capVnd: 100000 },
        { userId: "user-2", capVnd: 100000 },
      ],
      groupBudgetVnd: 200000,
      stops: [
        {
          placeId: "museum",
          startsAt: "2026-11-09T09:00:00+07:00",
          endsAt: "2026-11-09T10:00:00+07:00",
          selections: [
            { userId: "user-1", itemId: "ticket", quantity: 1 },
            { userId: "user-2", itemId: "ticket", quantity: 1 },
          ],
        },
      ],
    },
    data: {
      places: {
        museum: {
          indoors: true,
          hours,
          menu: [{ id: "ticket", priceVnd: 50000 }],
        },
        park: {
          indoors: false,
          hours,
          menu: [{ id: "park-ticket", priceVnd: 0 }],
        },
      },
      travelMinutes: { "origin:museum": 30, "museum:park": 20 },
      weather: {
        forecastStart: "2026-11-09",
        hours: {
          "2026-11-09T09:00:00+07:00": 20,
          "2026-11-09T10:00:00+07:00": 20,
          "2026-11-09T11:00:00+07:00": 20,
        },
      },
    },
  };
}
