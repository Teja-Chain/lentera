"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Send, Sparkles, Shield, AlertCircle, Zap, ShieldCheck, ShieldAlert, ArrowRightLeft, CornerDownLeft } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import { MessageItem } from "./MessageItem";
import { DemoPresets } from "./DemoPresets";
import type { ChatMessage } from "@/types/chat";

export function ChatContainer() {
  const { address, isConnected } = useAccount();
  const messages = useAgentStore((s) => s.messages);
  const isLoading = useAgentStore((s) => s.isLoading);
  const addMessage = useAgentStore((s) => s.addMessage);
  const appendStreamChunk = useAgentStore((s) => s.appendStreamChunkToAssistant);
  const setStreamingAssistantId = useAgentStore((s) => s.setStreamingAssistantId);
  const setLoading = useAgentStore((s) => s.setLoading);
  const setRiskProfile = useAgentStore((s) => s.setRiskProfile);
  const addInspectorEvent = useAgentStore((s) => s.addInspectorEvent);
  const setActiveAiProvider = useAgentStore((s) => s.setActiveAiProvider);

  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat only when messages exist
  useEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Hydrate persistent Sibyl Memory whenever wallet address changes
  useEffect(() => {
    if (!address) {
      setRiskProfile(null);
      return;
    }

    fetch(`/api/memory?wallet=${address}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setRiskProfile(data.profile, data.source);
        }
      })
      .catch((err) => console.warn("[Memory Hydration Failed]:", err));
  }, [address, setRiskProfile]);

  async function handleSendMessage(customPrompt?: string) {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || !address || isLoading) return;

    setInput("");

    // Add user message to UI
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Prepare placeholder assistant message for streaming
    const assistantMsgId = `msg-${Date.now()}-a`;
    const placeholderAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    addMessage(placeholderAssistantMsg);
    setStreamingAssistantId(assistantMsgId);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message: textToSend,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported by browser");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              if (data.type === "event" && data.event) {
                addInspectorEvent(data.event);
              } else if (data.type === "chunk" && data.text) {
                appendStreamChunk(assistantMsgId, data.text);
              } else if (data.type === "provider_info" && data.provider) {
                setActiveAiProvider(data.provider);
              } else if (data.type === "done") {
                if (data.updatedProfile) {
                  setRiskProfile(data.updatedProfile, data.source);
                }
              }
            } catch (jsonErr) {
              console.warn("Failed to parse SSE line:", trimmed, jsonErr);
            }
          }
        }
      }
    } catch (err: any) {
      appendStreamChunk(
        assistantMsgId,
        `\n\nI apologize, but I was unable to connect to the backend server. Your Sibyl Memory rules and assets remain fully protected. Please check your network connection and try again.`
      );

      // Record full technical payload into Developer Drawer
      addInspectorEvent({
        id: `ev-${Date.now()}-clienterr`,
        type: "FALLBACK",
        timestamp: new Date().toLocaleTimeString(),
        title: "Client Network Connection Error",
        data: {
          errorMessage: err?.message || "Fetch failed",
          errorName: err?.name,
          errorStack: err?.stack,
          timestamp: new Date().toISOString(),
        },
        status: "info",
      });
    } finally {
      setStreamingAssistantId(null);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0a0b12]">
      {/* Messages Scroll Area */}
      <div ref={scrollContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center pt-6 sm:pt-8 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-xl shadow-purple-500/20"
              style={{ background: "linear-gradient(135deg, #7c6ff7, #22d3ee)" }}
            >
              <Sparkles size={24} />
            </div>

            <h2 className="mt-4 text-base font-semibold text-zinc-100">
              Autonomous Risk-Aware Portfolio Assistant
            </h2>
            <p className="mt-1.5 text-xs text-zinc-400 max-w-md leading-relaxed">
              Lentera enforces your personal risk boundaries using load-bearing Sibyl Memory on Base Sepolia. Your rules survive across fresh sessions.
            </p>

            {/* Quick Demo Presets */}
            <div className="mt-6 w-full text-left">
              <DemoPresets
                onSelectPreset={handleSendMessage}
                disabled={!isConnected || isLoading}
              />
            </div>

            {!isConnected && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                <AlertCircle size={14} />
                <span>Connect your wallet above to activate load-bearing Sibyl Memory.</span>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div className="flex items-center gap-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-zinc-300 w-fit">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles size={13} className="animate-spin text-cyan-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <span>Lentera is evaluating Sibyl Memory & running risk guards...</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            </div>
          </div>
        )}
      </div>

      {/* Persistent Quick Action Pills Dock & Input Bar */}
      <div className="border-t border-white/10 bg-[#0c0e18]/90 px-3 sm:px-6 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-4xl space-y-2.5">
          {/* Quick Action Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 shrink-0 mr-1">
              <Zap size={11} className="text-cyan-400" /> Quick Actions:
            </span>

            <button
              type="button"
              disabled={!isConnected || isLoading}
              onClick={() =>
                handleSendMessage(
                  "Please set my risk profile to strict low risk: maximum 1% slippage, strictly no unverified or meme tokens, and maximum 50 USDC budget per transaction."
                )
              }
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 font-medium text-purple-300 hover:border-purple-500/50 hover:bg-purple-500/20 active:scale-95 transition-all disabled:opacity-40"
              title="Session 1: Set Strict Low Risk"
            >
              <ShieldCheck size={12} className="text-purple-400" />
              <span>S1: Strict Low Risk</span>
            </button>

            <button
              type="button"
              disabled={!isConnected || isLoading}
              onClick={() =>
                handleSendMessage(
                  "Attempt to swap 50 USDC to unverified MEME token with 2% slippage tolerance."
                )
              }
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 font-medium text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/20 active:scale-95 transition-all disabled:opacity-40"
              title="Session 2 Proof: Attempt MEME Swap (Guard Test)"
            >
              <ShieldAlert size={12} className="text-rose-400" />
              <span>S2: Attempt MEME Swap</span>
            </button>

            <button
              type="button"
              disabled={!isConnected || isLoading}
              onClick={() =>
                handleSendMessage(
                  "Please execute a safe swap of 5 USDC to WETH on Base Sepolia."
                )
              }
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-40"
              title="Swap USDC -> WETH on Base Sepolia"
            >
              <ArrowRightLeft size={12} className="text-emerald-400" />
              <span>Swap USDC → WETH</span>
            </button>

            <button
              type="button"
              disabled={!isConnected || isLoading}
              onClick={() =>
                handleSendMessage("What are my current active risk rules stored in Sibyl Memory?")
              }
              className="flex items-center gap-1.5 shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-medium text-zinc-300 hover:border-white/20 hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
              title="Inspect Current Rules"
            >
              <Sparkles size={12} className="text-cyan-400" />
              <span>Inspect Rules</span>
            </button>
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#131522] px-4 py-2.5 shadow-inner transition-all focus-within:border-purple-500/60 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.15)]"
          >
            <Shield size={16} className="text-zinc-500 shrink-0" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!isConnected || isLoading}
              placeholder={
                isConnected
                  ? "Instruct Lentera (e.g. 'Set max slippage to 1%' or 'Swap 50 USDC to WETH')..."
                  : "Connect your wallet above to begin..."
              }
              className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-40"
            />

            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-zinc-500 font-mono">
              <CornerDownLeft size={10} /> Enter
            </span>

            <button
              type="submit"
              disabled={!isConnected || isLoading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-md shadow-purple-500/20 transition-all hover:opacity-95 active:scale-95 disabled:opacity-30"
              title="Send Prompt"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
