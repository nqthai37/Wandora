import { savePlan } from "@/server/plans/runtime";

export async function POST(
  request: Request,
  context: { params: Promise<{ planId: string }> },
): Promise<Response> {
  return savePlan(request, context);
}
