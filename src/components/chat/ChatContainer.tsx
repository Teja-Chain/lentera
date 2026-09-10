"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Send, Sparkles, Shield, AlertCircle } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        `\n\n[Agent Error]: Failed to reach Lentera backend (${
          err?.message || "Unknown error"
        }). Please check your AI API keys or connection.`
      );
    } finally {
      setStreamingAssistantId(null);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#0a0b12]">
      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center pt-10 text-center">
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
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles size={12} className="animate-spin" />
            </div>
            <span>Lentera is evaluating memory and executing risk guards...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-white/10 bg-[#0d0f19]/90 p-4 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="mx-auto flex max-w-4xl items-center gap-2 rounded-2xl border border-white/10 bg-[#141624] px-4 py-2.5 shadow-inner focus-within:border-purple-500/50"
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
                : "Connect your wallet first to begin..."
            }
            className="flex-1 bg-transparent text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-40"
          />

          <button
            type="submit"
            disabled={!isConnected || isLoading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-md shadow-purple-500/20 transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
