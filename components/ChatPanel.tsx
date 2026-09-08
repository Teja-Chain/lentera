"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Send, ShieldCheck } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { MessageBubble } from "./MessageBubble";
import { AgentAvatar } from "./Avatar";
import type { ChatResponse } from "@/lib/types";

const SUGGESTIONS = [
  "I have 100 USDC, max slippage 1%, never buy unverified tokens",
  "Swap 50 USDC into that new MEME token",
];

export function ChatPanel() {
  const { address, isConnected } = useAccount();
  const messages = useAgentStore((s) => s.messages);
  const isLoading = useAgentStore((s) => s.isLoading);
  const addMessage = useAgentStore((s) => s.addMessage);
  const setLoading = useAgentStore((s) => s.setLoading);
  const setRiskProfile = useAgentStore((s) => s.setRiskProfile);
  const setRecentEvents = useAgentStore((s) => s.setRecentEvents);
  const pushSavedMemory = useAgentStore((s) => s.pushSavedMemory);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate memory panel from whatever is already stored, independent of
  // this browser tab's chat history -- proves memory outlives the session.
  useEffect(() => {
    if (!address) return;
    fetch(`/api/memory?wallet=${address}`)
      .then((r) => r.json())
      .then((data) => {
        setRiskProfile(data.riskProfile ?? null);
        setRecentEvents(data.recentEvents ?? []);
      })
      .catch(() => {});
  }, [address, setRiskProfile, setRecentEvents]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || !address || isLoading) return;
    setInput("");
    addMessage({ role: "user", content: value });
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message: value,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ChatResponse = await res.json();
      addMessage({ role: "assistant", content: data.reply, decision: data.decision, reasoning: data.reasoning });
      const entity = data.recalledMemory.find((c) => c.category === "risk_profile");
      if (entity) setRiskProfile(entity.data as Record<string, unknown>);
      setRecentEvents(data.recentEvents);
      if (data.savedMemory.length) pushSavedMemory(data.savedMemory);
    } catch {
      addMessage({
        role: "assistant",
        content:
          "Couldn't reach the agent backend. Check that memory-service is running and an AI provider key is set in .env.local.",
        decision: "info",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 &&
          (isConnected ? (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-16 text-center">
              <AgentAvatar size={44} />
              <div>
                <p className="text-[15px] font-medium text-text">Tell the agent your risk tolerance</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                  Then hit <span className="font-medium text-text">New session</span> above and try to talk it into
                  breaking its own rule.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] text-text-muted transition-colors hover:border-accent/40 hover:text-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 pt-16 text-center">
              <AgentAvatar size={44} />
              <p className="text-[14px] text-text-muted">Connect a wallet to open a session with the agent.</p>
            </div>
          ))}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} wallet={address} />
        ))}
        {isLoading && (
          <div className="flex items-end gap-2.5">
            <AgentAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-surface px-4 py-3">
              <span className="dot-1 h-1.5 w-1.5 rounded-full bg-text-subtle" />
              <span className="dot-2 h-1.5 w-1.5 rounded-full bg-text-subtle" />
              <span className="dot-3 h-1.5 w-1.5 rounded-full bg-text-subtle" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border bg-surface/40 p-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2 shadow-inner focus-within:border-accent/50">
          <ShieldCheck size={16} className="shrink-0 text-text-subtle" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            disabled={!isConnected || isLoading}
            placeholder={isConnected ? "Ask the agent, or give it a trade instruction…" : "Connect wallet first…"}
            className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-subtle focus:outline-none disabled:opacity-40"
          />
          <button
            onClick={() => send()}
            disabled={!isConnected || isLoading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-30"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
