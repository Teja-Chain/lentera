import { getRiskProfile, getRecentEvents } from "@/lib/memory-client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) {
    return Response.json({ error: "wallet query param required" }, { status: 400 });
  }

  const [riskProfile, recentEvents] = await Promise.all([
    getRiskProfile(wallet).catch(() => null),
    getRecentEvents(10).catch(() => []),
  ]);

  return Response.json({ riskProfile, recentEvents });
}
