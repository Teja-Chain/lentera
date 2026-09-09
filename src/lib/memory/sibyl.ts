import "server-only";
import fs from "fs";
import path from "path";
import type { UserRiskProfile } from "@/types/memory";
import { DEFAULT_RISK_PROFILE, UserRiskProfileSchema } from "./schema";

const SIBYL_API_KEY = process.env.SIBYL_API_KEY;
const SIBYL_ENDPOINT = process.env.SIBYL_ENDPOINT || "https://api.sibyl.world";

// Persistent disk storage path for deterministic offline fallback
const DATA_DIR = path.join(process.cwd(), ".data");
const MEMORY_FILE = path.join(DATA_DIR, "sibyl_memory.json");

function ensureDataFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEMORY_FILE)) {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[Sibyl Memory] Could not initialize .data folder:", err);
  }
}

function readLocalMemory(): Record<string, UserRiskProfile> {
  ensureDataFile();
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Sibyl Memory] Failed reading local memory:", err);
  }
  return {};
}

function writeLocalMemory(store: Record<string, UserRiskProfile>): void {
  ensureDataFile();
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[Sibyl Memory] Failed writing local memory:", err);
  }
}

/**
 * Retrieve UserRiskProfile strictly scoped by wallet address.
 * Falls back deterministically to local disk cache if Sibyl API is offline or unconfigured.
 */
export async function getUserRiskProfile(walletAddress: string): Promise<{
  profile: UserRiskProfile;
  source: "sibyl-cloud" | "local-adapter";
}> {
  const normalized = walletAddress.toLowerCase();

  // Try cloud Sibyl SDK/API if key is available
  if (SIBYL_API_KEY) {
    try {
      const res = await fetch(`${SIBYL_ENDPOINT}/v1/memory/entity/${normalized}`, {
        headers: {
          Authorization: `Bearer ${SIBYL_API_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          const parsed = UserRiskProfileSchema.safeParse(json.data);
          if (parsed.success) {
            return {
              profile: {
                ...DEFAULT_RISK_PROFILE,
                ...parsed.data,
                lastUpdated: parsed.data.lastUpdated || new Date().toISOString(),
              },
              source: "sibyl-cloud",
            };
          }
        }
      }
    } catch (err) {
      console.warn("[Sibyl Memory] Cloud API failed, falling back to local adapter:", err);
    }
  }

  // Graceful deterministic fallback
  const store = readLocalMemory();
  const local = store[normalized];
  if (local) {
    return {
      profile: {
        ...DEFAULT_RISK_PROFILE,
        ...local,
      },
      source: "local-adapter",
    };
  }

  // If no record exists, initialize with default
  return {
    profile: {
      ...DEFAULT_RISK_PROFILE,
      lastUpdated: new Date().toISOString(),
    },
    source: "local-adapter",
  };
}

/**
 * Persist strictly deterministic rules to Sibyl Memory.
 * Chit-chat and conversational state MUST NOT be stored here.
 */
export async function setUserRiskProfile(
  walletAddress: string,
  updates: Partial<UserRiskProfile>
): Promise<{
  profile: UserRiskProfile;
  source: "sibyl-cloud" | "local-adapter";
}> {
  const normalized = walletAddress.toLowerCase();
  const { profile: current } = await getUserRiskProfile(normalized);

  const updatedProfile: UserRiskProfile = {
    ...current,
    ...updates,
    allowedTokens: updates.allowedTokens ?? current.allowedTokens,
    lastUpdated: new Date().toISOString(),
  };

  // Attempt cloud Sibyl update if configured
  let cloudSuccess = false;
  if (SIBYL_API_KEY) {
    try {
      const res = await fetch(`${SIBYL_ENDPOINT}/v1/memory/entity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SIBYL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: normalized,
          schema: "UserRiskProfile",
          data: updatedProfile,
        }),
      });
      if (res.ok) {
        cloudSuccess = true;
      }
    } catch (err) {
      console.warn("[Sibyl Memory] Cloud write failed, persisting to local disk:", err);
    }
  }

  // Always mirror to local persistent disk cache for resilience across restarts
  const store = readLocalMemory();
  store[normalized] = updatedProfile;
  writeLocalMemory(store);

  return {
    profile: updatedProfile,
    source: cloudSuccess ? "sibyl-cloud" : "local-adapter",
  };
}

/**
 * Reset profile back to defaults for testing
 */
export async function resetUserRiskProfile(walletAddress: string): Promise<UserRiskProfile> {
  const normalized = walletAddress.toLowerCase();
  const store = readLocalMemory();
  delete store[normalized];
  writeLocalMemory(store);
  return { ...DEFAULT_RISK_PROFILE, lastUpdated: new Date().toISOString() };
}
