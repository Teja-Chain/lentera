"use client";

import { Sparkles, RefreshCw, Cpu, ArrowLeft } from "lucide-react";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { useAgentStore } from "@/store/useAgentStore";
import { siteConfig } from "@/config/site";

export function Header() {
  const sessionIndex = useAgentStore((s) => s.sessionIndex);
  const startNewSession = useAgentStore((s) => s.startNewSession);
  const activeAiProvider = useAgentStore((s) => s.activeAiProvider);

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0c0e17]/90 px-3 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="/landing/index.html"
          className="flex items-center gap-2.5 sm:gap-3 group"
          title="Kembali ke Landing Page"
        >
          <div
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg shadow-purple-500/20 transition-transform group-hover:scale-105"
            style={{ background: "linear-gradient(135deg, #7c6ff7, #22d3ee)" }}
          >
            <Sparkles size={17} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100 group-hover:text-purple-300 transition-colors">
                {siteConfig.name}
              </span>
              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-purple-300 whitespace-nowrap">
                Base Sepolia
              </span>
            </div>
            <div className="hidden sm:block text-[11px] text-zinc-400">Autonomous Risk-Aware Portfolio Agent</div>
          </div>
        </a>

        {/* Engine Badge on desktop */}
        <div className="ml-2 hidden items-center gap-2 lg:flex">
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300">
            <Cpu size={12} />
            AI: {activeAiProvider === "gemini" ? "Gemini Flash" : activeAiProvider === "groq" ? "Groq Llama 3.3" : "Dual-Layer Engine"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Back to Landing Page Button */}
        <a
          href="/landing/index.html"
          title="Kembali ke Landing Page"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#14161f] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-purple-500/40 hover:bg-[#1b1e2a] hover:text-white"
        >
          <ArrowLeft size={13} />
          <span className="hidden md:inline">Landing</span>
        </a>

        {/* Session Indicator & Reset Button */}
        <button
          onClick={startNewSession}
          title="Start fresh conversation session while retaining persistent Sibyl Memory"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#14161f] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-purple-500/40 hover:bg-[#1b1e2a]"
        >
          <RefreshCw size={12} />
          <span className="hidden sm:inline">New Session (S#{sessionIndex})</span>
          <span className="sm:hidden font-mono text-[11px]">S#{sessionIndex}</span>
        </button>

        <ConnectButton />
      </div>
    </header>
  );
}
