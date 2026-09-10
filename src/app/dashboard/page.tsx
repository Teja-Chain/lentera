"use client";

import { useState } from "react";
import { MessageSquare, ShieldCheck, Activity } from "lucide-react";
import { Header } from "@/components/common/Header";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import { useAgentStore } from "@/store/useAgentStore";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"chat" | "inspector">("chat");
  const eventCount = useAgentStore((s) => s.inspectorEvents.length);
  const isLoading = useAgentStore((s) => s.isLoading);

  return (
    <div className="relative flex h-screen h-[100dvh] w-full flex-col bg-[#08090f] text-zinc-100 overflow-hidden select-none">
      {/* Ambient Cyber-Glow Lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-purple-600/10 blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-[500px] rounded-full bg-cyan-600/10 blur-[140px] z-0" />

      {/* Main Header */}
      <Header />

      {/* Mobile / Tablet Tab Switcher (< lg) */}
      <div className="flex shrink-0 border-b border-white/10 bg-[#0c0e17]/90 px-3 py-2 lg:hidden backdrop-blur-md">
        <div className="flex w-full rounded-xl bg-white/5 p-1 border border-white/5">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageSquare size={14} />
            <span>Assistant Chat</span>
            {isLoading && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />}
          </button>

          <button
            onClick={() => setActiveTab("inspector")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "inspector"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity size={14} />
            <span>Inspector</span>
            {eventCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                activeTab === "inspector" ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300"
              }`}>
                {eventCount}
              </span>
            )}
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative flex min-h-0 flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Section: Chat Interface */}
        <section
          className={`flex-1 min-h-0 flex-col overflow-hidden ${
            activeTab === "chat" ? "flex" : "hidden lg:flex"
          }`}
        >
          <ChatContainer />
        </section>

        {/* Right Section: Thought & Memory Inspector Stream */}
        <section
          className={`h-full shrink-0 min-h-0 overflow-hidden lg:w-[420px] xl:w-[450px] ${
            activeTab === "inspector" ? "flex flex-col w-full" : "hidden lg:flex"
          }`}
        >
          <InspectorPanel />
        </section>
      </main>
    </div>
  );
}
