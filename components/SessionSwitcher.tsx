"use client";

import { RotateCcw } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";

// Clears the chat transcript only. Stored memory (risk profile, journal) is
// untouched -- proving the agent's decisions come from Sibyl Memory, not
// from conversation history that a fresh session wouldn't have anyway.
export function SessionSwitcher() {
  const sessionIndex = useAgentStore((s) => s.sessionIndex);
  const startNewSession = useAgentStore((s) => s.startNewSession);

  return (
    <button
      onClick={startNewSession}
      title="Clear this chat to simulate a brand new session. Stored memory is not cleared."
      className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text"
    >
      <RotateCcw size={13} />
      <span className="hidden sm:inline">New session</span>
      <span className="font-tabular text-text-subtle">· #{sessionIndex}</span>
    </button>
  );
}
