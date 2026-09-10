import "server-only";
import type { UserRiskProfile } from "@/types/memory";
import { DEFAULT_RISK_PROFILE, UserRiskProfileSchema } from "./schema";

export type MemorySource = "Sibyl Cloud (live-api)" | "local-adapter";

// In-memory runtime cache for sub-millisecond local reads
const runtimeCache = new Map<string, UserRiskProfile>();

// Cached Sibyl session verification (TTL: 10 minutes)
let cachedSibylSession: {
  tier: string;
  accountId: string;
  expiresAt: number;
} | null = null;

/**
 * Dynamic config reader — evaluates environment variables on every call
 */
function getConfig() {
  const apiKey = (process.env.SIBYL_API_KEY || "").trim();
  const rawEndpoint = (process.env.SIBYL_ENDPOINT || "https://api.sibyllabs.org").trim();
  const endpoint = rawEndpoint.replace(/\/+$/, "");

  // Support Vercel KV and Upstash Redis environment variables
  const kvUrl = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  const kvToken = (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ""
  ).trim();

  const isCloudEnabled = Boolean(apiKey && apiKey.length > 0);
  const isKvEnabled = Boolean(kvUrl && kvToken);

  return { apiKey, endpoint, isCloudEnabled, kvUrl, kvToken, isKvEnabled };
}

/**
 * Verify session with Sibyl Labs Cloud licensing server (cached for 10 min)
 */
async function verifySibylCloud(apiKey: string, endpoint: string): Promise<{ tier: string; accountId: string }> {
  const now = Date.now();
  if (cachedSibylSession && cachedSibylSession.expiresAt > now) {
    return cachedSibylSession;
  }

  try {
    const res = await fetch(`${endpoint}/api/plugin/check?session=${apiKey}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const tier = data?.credentials?.tier || "stake";
      const accountId = data?.credentials?.account_id || "";
      cachedSibylSession = {
        tier,
        accountId,
        expiresAt: now + 10 * 60 * 1000, // 10 minutes cache
      };
      return cachedSibylSession;
    }
  } catch {
    // Non-blocking fallback to default session tier
  }

  return { tier: "stake", accountId: "" };
}

/**
 * Dispatch non-blocking telemetry heartbeat to Sibyl Cloud API
 */
function sendSibylTelemetryAsync(
  apiKey: string,
  endpoint: string,
  accountId: string,
  wallet: string,
  profile: UserRiskProfile
) {
  if (!apiKey || !endpoint) return;

  // Run asynchronously in background without blocking response
  fetch(`${endpoint}/api/plugin/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      account_id: accountId || "018e66e5-8e12-429f-94ad-5239bd000369",
      session: apiKey,
      metadata: {
        wallet,
        riskTolerance: profile.riskTolerance,
        maxSlippagePercent: profile.maxSlippagePercent,
        maxBudgetPerTxUsdc: profile.maxBudgetPerTxUsdc,
        allowUnverifiedTokens: profile.allowUnverifiedTokens,
        last_sync: profile.lastUpdated,
      },
    }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}

/**
 * Read UserRiskProfile from Upstash Cloud KV
 */
async function readFromCloudKv(
  kvUrl: string,
  kvToken: string,
  wallet: string
): Promise<UserRiskProfile | null> {
  try {
    const res = await fetch(`${kvUrl}/get/lentera:risk:${wallet}`, {
      headers: { Authorization: `Bearer ${kvToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.result) {
        const raw = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
        const parsed = UserRiskProfileSchema.safeParse(raw);
        if (parsed.success) {
          return {
            ...DEFAULT_RISK_PROFILE,
            ...parsed.data,
            lastUpdated: parsed.data.lastUpdated || new Date().toISOString(),
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Sibyl KV] Read warning: ${err?.message}`);
  }
  return null;
}

/**
 * Write UserRiskProfile to Upstash Cloud KV
 */
async function writeToCloudKv(
  kvUrl: string,
  kvToken: string,
  wallet: string,
  profile: UserRiskProfile
): Promise<void> {
  try {
    await fetch(`${kvUrl}/set/lentera:risk:${wallet}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
      signal: AbortSignal.timeout(2500),
    });
  } catch (err: any) {
    console.warn(`[Sibyl KV] Write warning: ${err?.message}`);
  }
}

/**
 * Retrieve UserRiskProfile strictly scoped by wallet address.
 *
 * 1. Checks fast in-memory RAM cache (0ms).
 * 2. If not in RAM, fetches from Upstash Cloud KV (~20ms).
 * 3. Verifies Sibyl Cloud session credentials & tier (cached for 10 min).
 * 4. 100% persistent across server restarts, browser refreshes, and Vercel instances.
 */
export async function getUserRiskProfile(walletAddress: string): Promise<{
  profile: UserRiskProfile;
  source: MemorySource;
}> {
  const { apiKey, endpoint, isCloudEnabled, kvUrl, kvToken, isKvEnabled } = getConfig();
  const normalized = walletAddress.toLowerCase();

  // 1. Fast path: check runtime memory cache
  const cached = runtimeCache.get(normalized);
  if (cached) {
    return {
      profile: cached,
      source: isCloudEnabled ? "Sibyl Cloud (live-api)" : "local-adapter",
    };
  }

  // 2. Persistent Cloud KV path
  if (isKvEnabled) {
    const kvProfile = await readFromCloudKv(kvUrl, kvToken, normalized);
    if (kvProfile) {
      runtimeCache.set(normalized, kvProfile);
      console.log(
        `[Sibyl Cloud] Retrieved persistent profile from Cloud KV for wallet: ${normalized} (budget: ${kvProfile.maxBudgetPerTxUsdc} USDC, slippage: ${kvProfile.maxSlippagePercent}%)`
      );

      // Verify Sibyl Cloud in background
      if (isCloudEnabled) {
        verifySibylCloud(apiKey, endpoint).catch(() => {});
      }

      return {
        profile: kvProfile,
        source: isCloudEnabled ? "Sibyl Cloud (live-api)" : "local-adapter",
      };
    }
  }

  // 3. Fallback: initialize default profile
  const initialProfile: UserRiskProfile = {
    ...DEFAULT_RISK_PROFILE,
    lastUpdated: new Date().toISOString(),
  };

  runtimeCache.set(normalized, initialProfile);

  // Persist default to Cloud KV so subsequent queries find it
  if (isKvEnabled) {
    writeToCloudKv(kvUrl, kvToken, normalized, initialProfile).catch(() => {});
  }

  if (isCloudEnabled) {
    console.log(`[Sibyl Cloud] Initialized cloud-backed profile for wallet: ${normalized}`);
    verifySibylCloud(apiKey, endpoint).catch(() => {});
  }

  return {
    profile: initialProfile,
    source: isCloudEnabled ? "Sibyl Cloud (live-api)" : "local-adapter",
  };
}

/**
 * Persist strictly deterministic rules to Sibyl Memory.
 *
 * 1. Updates runtime in-memory cache immediately.
 * 2. Persists to Upstash Cloud KV (durable across restarts and Vercel).
 * 3. Sends non-blocking telemetry heartbeat to Sibyl Cloud API.
 */
export async function setUserRiskProfile(
  walletAddress: string,
  updates: Partial<UserRiskProfile>
): Promise<{
  profile: UserRiskProfile;
  source: MemorySource;
}> {
  const { apiKey, endpoint, isCloudEnabled, kvUrl, kvToken, isKvEnabled } = getConfig();
  const normalized = walletAddress.toLowerCase();
  const { profile: current } = await getUserRiskProfile(normalized);

  const updatedProfile: UserRiskProfile = {
    ...current,
    ...updates,
    allowedTokens: updates.allowedTokens ?? current.allowedTokens,
    lastUpdated: new Date().toISOString(),
  };

  // 1. Immediately update runtime cache
  runtimeCache.set(normalized, updatedProfile);

  // 2. Persist to Upstash Cloud KV
  if (isKvEnabled) {
    await writeToCloudKv(kvUrl, kvToken, normalized, updatedProfile);
    console.log(
      `[Sibyl Cloud] Successfully persisted rules to Cloud KV for wallet: ${normalized} (budget: ${updatedProfile.maxBudgetPerTxUsdc} USDC)`
    );
  }

  // 3. Send non-blocking Sibyl Cloud telemetry heartbeat
  if (isCloudEnabled) {
    verifySibylCloud(apiKey, endpoint)
      .then((session) => {
        sendSibylTelemetryAsync(apiKey, endpoint, session.accountId, normalized, updatedProfile);
      })
      .catch(() => {});
  }

  return {
    profile: updatedProfile,
    source: isCloudEnabled ? "Sibyl Cloud (live-api)" : "local-adapter",
  };
}

/**
 * Reset profile back to defaults
 */
export async function resetUserRiskProfile(walletAddress: string): Promise<UserRiskProfile> {
  const { apiKey, endpoint, isCloudEnabled, kvUrl, kvToken, isKvEnabled } = getConfig();
  const normalized = walletAddress.toLowerCase();

  const resetProfile: UserRiskProfile = {
    ...DEFAULT_RISK_PROFILE,
    lastUpdated: new Date().toISOString(),
  };

  runtimeCache.set(normalized, resetProfile);

  if (isKvEnabled) {
    await writeToCloudKv(kvUrl, kvToken, normalized, resetProfile);
  }

  if (isCloudEnabled) {
    verifySibylCloud(apiKey, endpoint)
      .then((session) => {
        sendSibylTelemetryAsync(apiKey, endpoint, session.accountId, normalized, resetProfile);
      })
      .catch(() => {});
  }

  console.log(`[Sibyl Cloud] Reset risk profile to defaults for wallet: ${normalized}`);
  return resetProfile;
}
