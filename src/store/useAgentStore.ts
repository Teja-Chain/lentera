import { create } from "zustand";
import type { ChatMessage } from "@/types/chat";
import type { InspectorEvent } from "@/types/inspector";
import type { UserRiskProfile } from "@/types/memory";

interface AgentState {
  sessionIndex: number;
  messages: ChatMessage[];
  streamingAssistantId: string | null;  // ID of the currently streaming assistant msg
  riskProfile: UserRiskProfile | null;
  memorySource: string | null;
  inspectorEvents: InspectorEvent[];
  isLoading: boolean;
  activeAiProvider: "gemini" | "groq" | null;

  // Actions
  addMessage: (m: ChatMessage) => void;
  setStreamingAssistantId: (id: string | null) => void;
  appendStreamChunkToAssistant: (id: string, textChunk: string) => void;
  setRiskProfile: (p: UserRiskProfile | null, source?: string | null) => void;
  addInspectorEvent: (e: InspectorEvent) => void;
  clearInspectorEvents: () => void;
  setLoading: (v: boolean) => void;
  setActiveAiProvider: (p: "gemini" | "groq" | null) => void;
  startNewSession: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  sessionIndex: 1,
  messages: [],
  streamingAssistantId: null,
  riskProfile: null,
  memorySource: null,
  inspectorEvents: [],
  isLoading: false,
  activeAiProvider: null,

  addMessage: (m) =>
    set((s) => ({
      messages: [...s.messages, m],
    })),

  setStreamingAssistantId: (id) => set({ streamingAssistantId: id }),

  appendStreamChunkToAssistant: (id, textChunk) =>
    set((s) => ({
      messages: s.messages.map((msg) =>
        msg.id === id
          ? { ...msg, content: msg.content + textChunk }
          : msg
      ),
    })),

  setRiskProfile: (p, source) =>
    set((s) => ({
      riskProfile: p,
      memorySource: source !== undefined ? source : s.memorySource,
    })),

  addInspectorEvent: (e) =>
    set((s) => ({
      // Avoid duplicate event IDs
      inspectorEvents: s.inspectorEvents.some((ev) => ev.id === e.id)
        ? s.inspectorEvents
        : [...s.inspectorEvents, e],
    })),

  clearInspectorEvents: () => set({ inspectorEvents: [] }),

  setLoading: (v) => set({ isLoading: v }),

  setActiveAiProvider: (p) => set({ activeAiProvider: p }),

  // Starting a new session clears UI chat history, but RETAINS persistent Sibyl Memory!
  startNewSession: () =>
    set((s) => ({
      sessionIndex: s.sessionIndex + 1,
      messages: [],
      streamingAssistantId: null,
    })),
}));
