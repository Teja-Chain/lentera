import { create } from "zustand";
import type { ChatMessage, MemoryCard } from "@/lib/types";

interface AgentState {
  sessionIndex: number;
  messages: ChatMessage[];
  riskProfile: Record<string, unknown> | null;
  recentEvents: unknown[];
  savedMemoryLog: MemoryCard[];
  isLoading: boolean;
  addMessage: (m: Omit<ChatMessage, "timestamp">) => void;
  setRiskProfile: (p: Record<string, unknown> | null) => void;
  setRecentEvents: (e: unknown[]) => void;
  pushSavedMemory: (cards: MemoryCard[]) => void;
  setLoading: (v: boolean) => void;
  startNewSession: () => void;
}

// Memory (riskProfile, recentEvents, savedMemoryLog) deliberately survives
// startNewSession() -- that persistence across a fresh chat is the whole
// point of the demo: session 2 must still see what session 1 taught it.
export const useAgentStore = create<AgentState>((set) => ({
  sessionIndex: 1,
  messages: [],
  riskProfile: null,
  recentEvents: [],
  savedMemoryLog: [],
  isLoading: false,
  addMessage: (m) => set((s) => ({ messages: [...s.messages, { ...m, timestamp: Date.now() }] })),
  setRiskProfile: (p) => set({ riskProfile: p }),
  setRecentEvents: (e) => set({ recentEvents: e }),
  pushSavedMemory: (cards) => set((s) => ({ savedMemoryLog: [...cards, ...s.savedMemoryLog] })),
  setLoading: (v) => set({ isLoading: v }),
  startNewSession: () => set((s) => ({ sessionIndex: s.sessionIndex + 1, messages: [] })),
}));
