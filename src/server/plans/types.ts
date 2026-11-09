export type Actor = { userId: string; role: "member" | "admin" };
export type Member = { userId: string; capVnd: number };
export type Selection = { userId: string; itemId: string; quantity: number };
export type Stop = {
  placeId: string;
  startsAt: string;
  endsAt: string;
  selections: Selection[];
};
export type Plan = {
  id: string;
  groupId: string;
  creatorId: string;
  version: number;
  state: "draft" | "saved";
  candidateConfirmed: boolean;
  startsAt: string;
  startPlaceId: string;
  members: Member[];
  groupBudgetVnd: number;
  stops: Stop[];
};
export type CheckedData = {
  places: Record<
    string,
    {
      indoors: boolean;
      // JS weekday: Sunday = 0. Minutes from local midnight, [open, close].
      hours: Record<string, [number, number][]>;
      menu: { id: string; priceVnd: number }[];
    }
  >;
  travelMinutes: Record<string, number>;
  weather: { forecastStart: string; hours: Record<string, number> };
};
export type PlanRecord = { plan: Plan; data: CheckedData };
export type FieldError = { pointer: string; code: string; detail: string };
export type Cost = {
  currency: "VND";
  totalVnd: number;
  members: { userId: string; totalVnd: number }[];
};
export type SaveReceipt = {
  planId: string;
  groupId: string;
  version: number;
  state: "saved";
  sharedWithGroup: true;
  savedAt: string;
  cost: Cost;
};
