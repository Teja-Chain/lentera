import type { InspectorEvent } from "./inspector";
import type { UserRiskProfile } from "./memory";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  events?: InspectorEvent[];
  decision?: "approved" | "blocked" | "info";
  reasoning?: string;
  txHash?: string;
}

export interface ChatRequestPayload {
  walletAddress: string;
  message: string;
  history?: { role: MessageRole; content: string }[];
}

export interface ChatStreamEventChunk {
  event?: InspectorEvent;
  contentChunk?: string;
  done?: boolean;
  updatedProfile?: UserRiskProfile;
}
