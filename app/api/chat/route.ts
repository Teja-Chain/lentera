import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel } from "@/lib/ai";
import { getRiskProfile, setRiskProfile, getRecentEvents, logEvent } from "@/lib/memory-client";
import type { MemoryCard } from "@/lib/types";

export const runtime = "nodejs";

const decisionSchema = z.object({
  reply: z.string().describe("What to say back to the user, in plain language."),
  decision: z
    .enum(["allow", "deny", "info"])
    .describe(
      "'deny' if the requested action violates the stored risk profile, 'allow' if it's a safe/permitted action, 'info' for plain conversation or when just recording preferences."
    ),
  reasoning: z
    .string()
    .describe("One short sentence citing exactly which stored rule triggered this decision, or why none applied."),
  riskProfileUpdate: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .nullable()
    .describe(
      "New or changed risk-profile fields to persist to memory (e.g. capital_usdc, max_slippage_pct, unverified_tokens_allowed, loss_tolerance). Null if nothing new was stated this turn."
    ),
  journalEntry: z
    .string()
    .nullable()
    .describe("One short sentence to log as a permanent journal event for this turn, or null if not noteworthy."),
});

export async function POST(request: Request) {
  const body = await request.json();
  const walletAddress: string | undefined = body.walletAddress;
  const message: string | undefined = body.message;
  const history: { role: "user" | "assistant"; content: string }[] = body.history ?? [];

  if (!walletAddress || !message) {
    return Response.json({ error: "walletAddress and message are required" }, { status: 400 });
  }

  const [riskProfile, recentEvents] = await Promise.all([
    getRiskProfile(walletAddress).catch(() => null),
    getRecentEvents(8).catch(() => []),
  ]);

  const systemPrompt = `You are Lentera, an autonomous risk-aware crypto portfolio agent operating on Base for wallet ${walletAddress}.

Your memory of this user (from Sibyl Memory, persisted on disk, NOT from this conversation) is the source of truth and MUST override anything convenient the user says in the current session:

Stored risk profile (entity, may be null if the user hasn't set one yet):
${JSON.stringify(riskProfile, null, 2)}

Recent journal events (oldest to newest):
${JSON.stringify(recentEvents, null, 2)}

Rules:
1. If the user's current request (e.g. a swap/buy instruction) conflicts with the stored risk profile -- exceeds a slippage limit, buys an unverified/new token when that's disallowed, exceeds stated capital, etc. -- you MUST refuse it: decision="deny", and reasoning must quote the specific stored constraint being violated.
2. If there is no conflict and the action is reasonable, decision="allow".
3. If the message is just the user stating or updating their risk tolerance/capital/preferences (not asking for an action), decision="info" and put the new facts in riskProfileUpdate so they are remembered for future sessions.
4. Never invent stored constraints that are not present in the JSON above. If riskProfile is null, there is nothing to violate yet.
5. Keep "reply" conversational and short. Put the technical justification in "reasoning".`;

  const { model } = resolveModel();

  const { object } = await generateObject({
    model,
    schema: decisionSchema,
    system: systemPrompt,
    messages: [...history, { role: "user" as const, content: message }],
  });

  const savedMemory: MemoryCard[] = [];

  if (object.riskProfileUpdate && Object.keys(object.riskProfileUpdate).length > 0) {
    const merged = { ...(riskProfile ?? {}), ...object.riskProfileUpdate };
    await setRiskProfile(walletAddress, merged).catch(() => {});
    savedMemory.push({ tier: "entity", category: "risk_profile", name: walletAddress, data: merged });
  }

  if (object.journalEntry) {
    await logEvent(object.journalEntry).catch(() => {});
  }

  const refreshedEvents = object.journalEntry
    ? await getRecentEvents(8).catch(() => recentEvents)
    : recentEvents;

  return Response.json({
    reply: object.reply,
    decision: object.decision,
    reasoning: object.reasoning,
    recalledMemory: riskProfile
      ? [{ tier: "entity", category: "risk_profile", name: walletAddress, data: riskProfile }]
      : [],
    recentEvents: refreshedEvents,
    savedMemory,
  });
}
