export type Decision = "allow" | "deny" | "info";

export type MemoryCard = {
  tier: "state" | "entity" | "journal";
  category: string;
  name: string;
  data: unknown;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  decision?: Decision;
  reasoning?: string;
  timestamp: number;
};

export type ChatResponse = {
  reply: string;
  decision: Decision;
  reasoning: string;
  recalledMemory: MemoryCard[];
  recentEvents: unknown[];
  savedMemory: MemoryCard[];
};
