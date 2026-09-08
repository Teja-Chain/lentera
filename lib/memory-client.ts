// Server-only client for the Sibyl Memory backend (memory-service/, a small
// FastAPI wrapper around the sibyl-memory-client Python SDK). Sibyl Memory is
// file-based/local, so it cannot run inside a Vercel serverless function --
// it needs to live on a persistent host. This module just talks HTTP to it.
import "server-only";

const BASE_URL = process.env.MEMORY_SERVICE_URL ?? "http://localhost:8787";

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`memory-service ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type RiskProfile = {
  capital_usdc?: number;
  max_slippage_pct?: number;
  unverified_tokens_allowed?: boolean;
  loss_tolerance?: string;
  notes?: string;
  [key: string]: unknown;
};

export async function getRiskProfile(wallet: string): Promise<RiskProfile | null> {
  return request(`/entity/risk_profile/${wallet.toLowerCase()}`);
}

export async function setRiskProfile(wallet: string, data: RiskProfile) {
  return request(`/entity`, {
    method: "POST",
    body: JSON.stringify({ category: "risk_profile", name: wallet.toLowerCase(), data }),
  });
}

export async function getRecentEvents(limit = 10): Promise<unknown[]> {
  const res = await request(`/events?limit=${limit}`);
  return (res?.events as unknown[]) ?? [];
}

export async function logEvent(text: string) {
  return request(`/event`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function searchMemory(query: string): Promise<unknown[]> {
  const res = await request(`/search?q=${encodeURIComponent(query)}`);
  return (res?.results as unknown[]) ?? [];
}
